"""
BankShield AI — FastAPI application entrypoint.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.routes import auth, accounts, transactions, beneficiaries, risk, notifications, admin, ws_alerts
from app.services.risk_engine import model_status
from app.services.notification_channels import channel_status

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bankshield")

app = FastAPI(
    title="BankShield AI API",
    description="Intelligent Banking & Real-Time Fraud Detection System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Creates tables if they don't already exist (schema.sql is the
    # canonical source of truth for a fresh MySQL setup, this is a
    # convenience so the API doesn't hard-crash on first boot).
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:  # noqa: BLE001
        logger.error("Database connection failed at startup: %s", exc)

    status = model_status()
    if not status["loaded"]:
        logger.warning(
            "ML fraud model not loaded (%s). Falling back to rule-based risk "
            "scoring. Run `python ml/train_model.py` to generate ml/fraud_model.pkl.",
            status["error"],
        )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health")
def health():
    return {"status": "ok", "ml_model": model_status(), "notifications": channel_status()}


app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(beneficiaries.router)
app.include_router(risk.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(ws_alerts.router)
