"""Real-world notification channels for BankShield AI."""

import base64
import logging
import os
import urllib.parse
import urllib.request

import resend

from app.config import settings

logger = logging.getLogger("bankshield")


def channel_status() -> dict:
    return {
        "email": bool(os.getenv("RESEND_API_KEY")),
        "sms": bool(
            settings.TWILIO_ACCOUNT_SID
            and settings.TWILIO_AUTH_TOKEN
            and settings.TWILIO_FROM_NUMBER
        ),
    }


def send_email(to: str, subject: str, body: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY")

    if not api_key:
        logger.warning("RESEND_API_KEY not configured; email skipped for %s", to)
        return False

    try:
        resend.api_key = api_key

        params = {
            "from": os.getenv("RESEND_FROM", "onboarding@resend.dev"),
            "to": [to],
            "subject": subject,
            "html": body.replace("\n", "<br>"),
        }

        result = resend.Emails.send(params)

        logger.info("Email sent successfully to %s: %s", to, result)
        return True

    except Exception as exc:
        logger.warning(
            "Resend email delivery failed for %s: %s",
            to,
            exc,
        )
        return False


def send_sms(to: str, message: str) -> bool:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER:
        logger.warning("Twilio not configured; SMS skipped for %s", to)
        return False

    try:
        url = (
            f"https://api.twilio.com/2010-04-01/"
            f"Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        )

        data = urllib.parse.urlencode({
            "From": settings.TWILIO_FROM_NUMBER,
            "To": to,
            "Body": message,
        }).encode()

        auth = base64.b64encode(
            f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode()
        ).decode()

        req = urllib.request.Request(
            url,
            data=data,
            method="POST",
            headers={"Authorization": f"Basic {auth}"},
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            return 200 <= response.status < 300

    except Exception as exc:
        logger.warning("SMS delivery failed for %s: %s", to, exc)
        return False