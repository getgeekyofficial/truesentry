import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Kafka
try:
    from aiokafka import AIOKafkaConsumer
except Exception:  # pragma: no cover
    AIOKafkaConsumer = None  # type: ignore

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("alerts")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

TOPIC_ENSEMBLE_DECISIONS = os.getenv("TOPIC_ENSEMBLE_DECISIONS", "ensemble.decisions")
ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "0.7"))

# Outbound providers (stubs)
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")

app = FastAPI(
    title="ID Protect Alerts Service",
    version="0.1.0",
    description="Consumes ensemble decisions and dispatches alerts (scaffold)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

consumer_task: Optional[asyncio.Task] = None


@app.on_event("startup")
async def on_startup():
    global consumer_task
    if AIOKafkaConsumer is not None:
        consumer_task = asyncio.create_task(consume_decisions())
    else:
        logger.warning("aiokafka not installed; consumer disabled")


@app.on_event("shutdown")
async def on_shutdown():
    global consumer_task
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
        consumer_task = None


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


async def consume_decisions():
    """
    Consumes ensemble decisions and triggers alert actions above threshold.
    In production:
      - Create/Update incidents in DB
      - De-duplicate alerts per incident
      - Dispatch via email/SMS/webhook; generate PDF reports
      - Preserve evidence chain (hashing, timestamping)
    """
    if AIOKafkaConsumer is None:
        return

    consumer = AIOKafkaConsumer(
        TOPIC_ENSEMBLE_DECISIONS,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        enable_auto_commit=True,
        auto_offset_reset="latest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    await consumer.start()
    logger.info(f"Kafka consumer started for topic {TOPIC_ENSEMBLE_DECISIONS}")

    try:
        async for msg in consumer:
            event: Dict[str, Any] = msg.value
            payload: Dict[str, Any] = event.get("payload") or {}
            confidence: float = float(payload.get("confidence", 0.0))
            identity_id: str = str(payload.get("identity_id", "unknown"))
            url: str = str(payload.get("url", ""))

            if confidence >= ALERT_THRESHOLD:
                # Stubbed alert action
                logger.warning(
                    f"[ALERT] identity={identity_id} url={url} confidence={confidence:.3f} "
                    f"threshold={ALERT_THRESHOLD}"
                )
                # Future: send_email(...), send_sms(...), post_webhook(...)
            else:
                logger.info(
                    f"Decision below threshold identity={identity_id} url={url} "
                    f"confidence={confidence:.3f} threshold={ALERT_THRESHOLD}"
                )
    except asyncio.CancelledError:
        logger.info("Consumer task cancelled")
    finally:
        await consumer.stop()
        logger.info("Kafka consumer stopped")
