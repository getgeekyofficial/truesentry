import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Kafka
try:
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
except Exception:  # pragma: no cover
    AIOKafkaConsumer = None  # type: ignore
    AIOKafkaProducer = None  # type: ignore

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ingestion")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

TOPIC_INGEST_MEDIA = os.getenv("TOPIC_INGEST_MEDIA", "ingest.media")
TOPIC_FORENSICS_REQ = os.getenv("TOPIC_FORENSICS_REQ", "forensics.requests")

app = FastAPI(
    title="ID Protect Ingestion Service",
    version="0.1.0",
    description="Connectors, crawlers, and ingestion pipeline scaffold",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

producer: Optional["AIOKafkaProducer"] = None
consumer_task: Optional[asyncio.Task] = None


@app.on_event("startup")
async def on_startup():
    global producer, consumer_task
    if AIOKafkaProducer is not None:
        try:
            producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
            await producer.start()
            logger.info("Kafka producer started")
        except Exception as e:
            logger.warning(f"Kafka producer not started: {e}")
            producer = None
    else:
        logger.warning("aiokafka not installed; running without Kafka producer")

    if AIOKafkaConsumer is not None:
        consumer_task = asyncio.create_task(consume_ingest_media())
    else:
        logger.warning("aiokafka not installed; consumer disabled")


@app.on_event("shutdown")
async def on_shutdown():
    global producer, consumer_task
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
        consumer_task = None

    if producer:
        try:
            await producer.stop()
        except Exception:
            pass
        producer = None


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


async def consume_ingest_media():
    """
    Consumes media submissions and emits forensics requests.
    In production, this would also handle:
      - URL fetching and metadata enrichment
      - Deduplication (perceptual hashes)
      - Reverse image/video search triggers
      - Priority assignment
    """
    if AIOKafkaConsumer is None:
        return

    consumer = AIOKafkaConsumer(
        TOPIC_INGEST_MEDIA,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        enable_auto_commit=True,
        auto_offset_reset="latest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    await consumer.start()
    logger.info(f"Kafka consumer started for topic {TOPIC_INGEST_MEDIA}")

    try:
        async for msg in consumer:
            payload: Dict[str, Any] = msg.value
            logger.info(f"Received media submission: {payload}")

            # Minimal enrichment stub
            enriched = {
                "type": "forensics.request",
                "payload": {
                    "url": payload.get("payload", {}).get("url") or payload.get("url"),
                    "source_hint": payload.get("payload", {}).get("source_hint"),
                    "identity_ids": payload.get("payload", {}).get("identity_ids"),
                    "priority": "normal",
                },
            }
            await _send_kafka(TOPIC_FORENSICS_REQ, enriched)
    except asyncio.CancelledError:
        logger.info("Consumer task cancelled")
    finally:
        await consumer.stop()
        logger.info("Kafka consumer stopped")


async def _send_kafka(topic: str, data: Dict[str, Any]):
    global producer
    if producer is None:
        logger.info(f"[DRY-RUN] send to {topic}: {data}")
        return
    await producer.send_and_wait(topic, json.dumps(data).encode("utf-8"))
