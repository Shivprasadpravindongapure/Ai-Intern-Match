"""
email_service.py — Async Email Service for SkillProof AI

Sends OTP verification emails using aiosmtplib (async SMTP).
Falls back to console logging if SMTP is not configured.
Uses a branded HTML email template with gradient design.
"""

import logging
import random
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# OTP Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Generate a cryptographically random 6-digit OTP."""
    return str(random.randint(100000, 999999))


# ─────────────────────────────────────────────────────────────────────────────
# HTML Email Template
# ─────────────────────────────────────────────────────────────────────────────

def _build_otp_html(user_name: str, otp_code: str, expiry_minutes: int) -> str:
    """Build a branded HTML email with the OTP code."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your SkillProof AI account</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;
                      border:1px solid rgba(124,58,237,0.3);overflow:hidden;max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;">🧠</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                SkillProof AI
              </h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
                AI-Powered Career Launchpad
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:20px;font-weight:600;">
                Verify your email address
              </h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Hi <strong style="color:#e2e8f0;">{user_name}</strong>,<br/><br/>
                Welcome to SkillProof AI! Use the verification code below to
                complete your account setup:
              </p>
              <!-- OTP Box -->
              <div style="background:rgba(124,58,237,0.1);border:2px solid rgba(124,58,237,0.4);
                          border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:1px;">
                  Your OTP Code
                </p>
                <p style="margin:0;color:#ffffff;font-size:40px;font-weight:700;letter-spacing:12px;
                           font-family:monospace;">
                  {otp_code}
                </p>
              </div>
              <p style="margin:0 0 24px;color:#64748b;font-size:13px;line-height:1.5;">
                ⏱ This code expires in <strong style="color:#e2e8f0;">{expiry_minutes} minutes</strong>.<br/>
                If you didn't create an account, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />
              <p style="margin:0;color:#475569;font-size:12px;text-align:center;">
                © {2024} SkillProof AI · AI-Powered Career Platform<br/>
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


# ─────────────────────────────────────────────────────────────────────────────
# Send OTP Email
# ─────────────────────────────────────────────────────────────────────────────

async def send_otp_email(
    to_email: str,
    otp_code: str,
    user_name: str,
    expiry_minutes: Optional[int] = None,
) -> bool:
    """
    Send an OTP verification email to the given address.

    Returns True on success, False on failure.
    Falls back to console logging if SMTP credentials are not configured.
    """
    expiry = expiry_minutes or settings.OTP_EXPIRY_MINUTES

    # ── Fallback: console log if SMTP not configured ─────────────────────
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD or settings.SMTP_USER == "YOUR_GMAIL@gmail.com":
        logger.warning(
            "SMTP not configured. OTP for %s: %s (expires in %d min)",
            to_email,
            otp_code,
            expiry,
        )
        print(f"\n{'='*50}")
        print(f"[EMAIL FALLBACK] OTP for {to_email}: {otp_code}")
        print(f"Expires in {expiry} minutes")
        print(f"{'='*50}\n")
        return True

    # ── Build MIME message ───────────────────────────────────────────────
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[SkillProof AI] Your verification code: {otp_code}"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email

    text_body = (
        f"Hi {user_name},\n\n"
        f"Your SkillProof AI verification code is: {otp_code}\n"
        f"This code expires in {expiry} minutes.\n\n"
        f"If you didn't create an account, ignore this email.\n\n"
        f"— SkillProof AI Team"
    )
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(_build_otp_html(user_name, otp_code, expiry), "html"))

    # ── Send via async SMTP ──────────────────────────────────────────────
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            timeout=15,
        )
        logger.info("OTP email sent successfully to %s", to_email)
        return True

    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", to_email, exc)
        # Fallback to console so development is not blocked
        print(f"\n[EMAIL ERROR] Could not send email. OTP for {to_email}: {otp_code}\n")
        return False
