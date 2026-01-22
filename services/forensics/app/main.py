import asyncio
import hashlib
import json
import logging
import math
import os
import time
from typing import Any, Dict, List, Optional

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
logger = logging.getLogger("forensics")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

TOPIC_FORENSICS_REQ = os.getenv("TOPIC_FORENSICS_REQ", "forensics.requests")
TOPIC_FORENSICS_RES = os.getenv("TOPIC_FORENSICS_RES", "forensics.results")

app = FastAPI(
    title="ID Protect Forensics Service",
    version="0.1.0",
    description="Runs media detectors and emits per-detector scores (scaffold)",
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
        consumer_task = asyncio.create_task(consume_forensics_requests())
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


def _deterministic_score(seed: str, name: str, bias: float = 0.0) -> float:
    """
    Deterministic pseudo-score in [0,1] based on sha256 of input to keep demo stable.
    """
    h = hashlib.sha256((seed + "::" + name).encode("utf-8")).digest()
    # Use first 8 bytes as integer
    v = int.from_bytes(h[:8], "big")
    # Map to [0,1)
    x = (v % 10_000_000) / 10_000_000.0
    # Apply mild bias and clipping
    x = min(max(x + bias, 0.0), 1.0)
    return x


async def consume_forensics_requests():
    """
    Consumes forensics requests and emits per-detector scores.
    In production:
      - Download/transcode media to standardized formats
      - Run GPU-accelerated models (face/audio/video detectors)
      - Implement prioritization, batching, mixed precision
    """
    if AIOKafkaConsumer is None:
        return

    consumer = AIOKafkaConsumer(
        TOPIC_FORENSICS_REQ,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        enable_auto_commit=True,
        auto_offset_reset="latest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    await consumer.start()
    logger.info(f"Kafka consumer started for topic {TOPIC_FORENSICS_REQ}")

    try:
        async for msg in consumer:
            payload: Dict[str, Any] = msg.value.get("payload") or msg.value
            url: Optional[str] = payload.get("url")
            identity_ids: Optional[List[str]] = payload.get("identity_ids")
            source_hint: Optional[str] = payload.get("source_hint")

            if not url:
                logger.warning(f"Skipping message without url: {payload}")
                continue

            # Simulated per-detector scores (replace with real inference)
            detectors = [
                ("face_xception", 0.00),
                ("face_vit", 0.02),
                ("audio_ast", -0.01),
                ("av_sync", 0.00),
                ("sensor_prnu", 0.00),
            ]
            scores: Dict[str, float] = {}
            versions: Dict[str, str] = {}

            for name, bias in detectors:
                scores[name] = _deterministic_score(url, name, bias=bias)
                versions[name] = "v0.0.1-demo"

            result_event = {
                "type": "forensics.result",
                "payload": {
                    "url": url,
                    "source_hint": source_hint,
                    "identity_candidates": identity_ids or [],
                    "scores": scores,
                    "model_versions": versions,
                    "processed_at": time.time(),
                },
            }
            await _send_kafka(TOPIC_FORENSICS_RES, result_event)
            logger.info(f"Emitted forensics result for url={url}")
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
