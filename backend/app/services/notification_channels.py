"""Optional real-world notification channels.

In-app/WebSocket alerts always work locally. Email and SMS become real when
SMTP/Twilio settings are supplied in .env; otherwise they fail gracefully.
"""
import base64
import logging
import smtplib
import urllib.parse
import urllib.request
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("bankshield")


def channel_status() -> dict:
    return {
        "email": bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD),
        "sms": bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER),
    }


def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured; email skipped for %s", to)
        return False
    try:
        msg = EmailMessage()
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USERNAME
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            if settings.SMTP_TLS:
                smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Email delivery failed for %s: %s", to, exc)
        return False


def send_sms(to: str, message: str) -> bool:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER:
        logger.warning("Twilio not configured; SMS skipped for %s", to)
        return False
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        data = urllib.parse.urlencode({"From": settings.TWILIO_FROM_NUMBER, "To": to, "Body": message}).encode()
        auth = base64.b64encode(f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode()).decode()
        req = urllib.request.Request(url, data=data, method="POST", headers={"Authorization": f"Basic {auth}"})
        with urllib.request.urlopen(req, timeout=15) as response:  # noqa: S310
            return 200 <= response.status < 300
    except Exception as exc:  # noqa: BLE001
        logger.warning("SMS delivery failed for %s: %s", to, exc)
        return False
