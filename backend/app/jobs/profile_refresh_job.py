"""
profile_refresh_job.py — Daily Profile Analysis scheduled cron loop

Triggers once daily at 9:00 AM UTC to query public APIs, evaluate parsed resumes,
and save profile snapshot recommendations. Safe against single user failures and rate-limiting.
"""

import asyncio
from datetime import datetime, time, timedelta
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.profile_analysis import ProfileAnalysis
from app.models.resume import Resume
from app.models.user_profile import UserProfile
from app.utils.github_client import fetch_github_profile, fetch_github_repos
from app.utils.profile_analysis_engine import analyze_profile_vs_resume


async def start_profile_refresh_loop() -> None:
    """
    Zero-dependency background loop running once per day at 9:00 AM UTC.
    Refreshes resume suggestions for all connected profiles.
    """
    print("[+] Profile Refresh Background Service initialized successfully!")
    while True:
        try:
            # 1 — Calculate delay until next 9:00 AM UTC
            now = datetime.utcnow()
            target_time = time(9, 0, 0)
            target_today = datetime.combine(now.date(), target_time)

            if now >= target_today:
                # Next run is tomorrow
                target_run = target_today + timedelta(days=1)
            else:
                # Next run is today
                target_run = target_today

            delay_seconds = (target_run - now).total_seconds()
            print(f"[+] Profile Refresh Service: next run scheduled at {target_run} UTC (in {delay_seconds:.1f} seconds)")

            # Sleep until target time
            await asyncio.sleep(delay_seconds)

            print("[+] Profile Refresh Service: daily run starting...")
            # 2 — Perform scheduled refresh
            refresh_all_connected_profiles()
            print("[+] Profile Refresh Service: daily run completed successfully!")

            # Brief cool down to prevent multiple executions in same second
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            print("[-] Profile Refresh Service: background loop cancelled.")
            break
        except Exception as e:
            print(f"[-] Profile Refresh Service: loop exception: {e}")
            await asyncio.sleep(60)  # Fail-safe backoff


def refresh_all_connected_profiles() -> None:
    """Queries all UserProfile rows and updates suggestions snapshots in database."""
    db: Session = SessionLocal()
    try:
        profiles = db.query(UserProfile).all()
        print(f"[+] Profile Refresh Service: found {len(profiles)} connected profiles to update.")

        for prof in profiles:
            try:
                # Fetch latest parsed resume of user
                resume = (
                    db.query(Resume)
                    .filter(Resume.user_id == prof.user_id)
                    .order_by(Resume.created_at.desc())
                    .first()
                )
                if not resume or not resume.parsed_data:
                    print(f"[-] Profile Refresh Service: skip user_id={prof.user_id} (no parsed resume).")
                    continue

                # Fetch public GitHub data if connected
                github_data = {}
                repos_list = []
                if prof.github_username:
                    gh_profile = fetch_github_profile(prof.github_username)
                    repos_list = fetch_github_repos(prof.github_username)
                    github_data = {
                        "username": gh_profile.get("username"),
                        "name": gh_profile.get("name"),
                        "bio": gh_profile.get("bio"),
                        "publicRepos": gh_profile.get("publicRepos"),
                        "followers": gh_profile.get("followers"),
                        "following": gh_profile.get("following"),
                        "recentRepos": [
                            {
                                "name": rp.get("name"),
                                "description": rp.get("description"),
                                "language": rp.get("language"),
                                "stars": rp.get("stars"),
                                "forks": rp.get("forks"),
                                "updatedAt": rp.get("updatedAt"),
                                "htmlUrl": rp.get("htmlUrl"),
                                "topics": rp.get("topics"),
                            }
                            for rp in repos_list
                        ],
                    }

                # LeetCode manual placeholder
                leetcode_data = {}
                if prof.leetcode_username:
                    leetcode_data = {
                        "username": prof.leetcode_username,
                        "profileUrl": prof.leetcode_url,
                    }

                # Compile updated suggestions
                analysis_res = analyze_profile_vs_resume(
                    profile={
                        "linkedin_url": prof.linkedin_url,
                        "github_url": prof.github_url,
                        "leetcode_url": prof.leetcode_url,
                        "portfolio_url": prof.portfolio_url,
                    },
                    resume_text=resume.extracted_text or "",
                    parsed_resume=resume.parsed_data,
                    github_repos=repos_list,
                )

                # Save new snapshot
                an = ProfileAnalysis(
                    user_id=prof.user_id,
                    user_profile_id=prof.id,
                    github_data=github_data,
                    leetcode_data=leetcode_data,
                    extracted_skills=analysis_res["extractedSkills"],
                    extracted_projects=analysis_res["extractedProjects"],
                    suggestions=analysis_res["suggestions"],
                )
                db.add(an)

                # Update last analyzed timestamp
                prof.last_analyzed_at = datetime.utcnow()
                db.add(prof)

                db.commit()
                print(f"[+] Profile Refresh Service: successfully refreshed user_id={prof.user_id}")
            except Exception as pe:
                print(f"[-] Profile Refresh Service: failed to refresh user_id={prof.user_id}: {pe}")
                db.rollback()
    finally:
        db.close()
