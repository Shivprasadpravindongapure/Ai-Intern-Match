"""
migrate_db.py — Database Migration Utility for SkillProof AI

Safely alters the SQLite database to add the new `parsed_data` column to
the `resumes` table if it does not already exist. This prevents having to
delete the database and recreate test users.
"""

import os
import sqlite3


def migrate() -> None:
    """Check for sqlite database and add parsed_data column to resumes table if needed."""
    # Find database in backend folder or parent folder
    db_paths = ["skillproof.db", "../skillproof.db", "backend/skillproof.db"]
    target_path = None

    for path in db_paths:
        if os.path.exists(path):
            target_path = path
            break

    if not target_path:
        print("[-] No skillproof.db database file found. It will be created on server startup.")
        return

    print(f"[+] Found database at: {os.path.abspath(target_path)}")

    try:
        conn = sqlite3.connect(target_path)
        cursor = conn.cursor()

        # Check existing columns in resumes table
        cursor.execute("PRAGMA table_info(resumes)")
        columns = [row[1] for row in cursor.fetchall()]

        if "parsed_data" not in columns:
            print("[+] Adding 'parsed_data' column to 'resumes' table...")
            cursor.execute("ALTER TABLE resumes ADD COLUMN parsed_data JSON")
            conn.commit()
            print("[+] Migration completed successfully!")
        else:
            print("[*] 'parsed_data' column already exists. No migration needed.")

        conn.close()

    except Exception as e:
        print(f"[-] Migration failed: {e}")


if __name__ == "__main__":
    migrate()
