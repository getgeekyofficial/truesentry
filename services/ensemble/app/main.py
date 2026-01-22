import asyncio
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

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
logger = logging.getLogger("ensemble")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

TOPIC_FORENSICS_RES = os.getenv("TOPIC_FORENSICS_RES", "forensics.results")
TOPIC_ENSEMBLE_DECISIONS = os.getenv("TOPIC_ENSEMBLE_DECISIONS", "ensemble.decisions")

# Simple detector weights for demo; in production store/manage per model and retrainable
DETECTOR_WEIGHTS: Dict[str, float] = {
    "face_xception": 0.25,
    "face_vit": 0.25,
    "audio_ast": 0.25,
    "av_sync": 0.15,
    "sensor_prnu": 0.10,
}

# Temperature for naive calibration (demo)
TEMPERATURE: float = float(os.getenv("CALIBRATION_TEMPERATURE", "1.3"))

app = FastAPI(
    title="ID Protect Ensemble Service",
    version="0.1.0",
    description="Combines detector outputs into calibrated confidence scores (scaffold)",
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
        consumer_task = asyncio.create_task(consume_forensics_results())
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


def _weighted_score(scores: Dict[str, float], weights: Dict[str, float]) -> Tuple[float, Dict[str, float]]:
    total_w = 0.0
    s = 0.0
    contribs: Dict[str, float] = {}
    for name, w in weights.items():
        if name in scores:
            s += w * scores[name]
            contribs[name] = w * scores[name]
            total_w += w
    if total_w <= 0:
        return 0.0, {}
    return s / total_w, contribs


def _temperature_scale(p: float, t: float) -> float:
    """
    Naive temperature scaling (demo). Real calibration uses held-out set.
    """
    p = min(max(p, 0.0), 1.0)
    if t <= 1e-6:
        return p
    # map to log-odds, scale, map back
    eps = 1e-6
    logit = (p + eps) / (1.0 - p + eps)
    logit = max(logit, eps)
    scaled_logit = (logit ** (1.0 / t))
    scaled_p = scaled_logit / (1.0 + scaled_logit)
    return float(min(max(scaled_p, 0.0), 1.0))


async def consume_forensics_results():
    """
    Consumes forensics results, applies fusion + calibration, emits decisions.
    """
    if AIOKafkaConsumer is None:
        return

    consumer = AIOKafkaConsumer(
        TOPIC_FORENSICS_RES,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        enable_auto_commit=True,
        auto_offset_reset="latest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    await consumer.start()
    logger.info(f"Kafka consumer started for topic {TOPIC_FORENSICS_RES}")

    try:
        async for msg in consumer:
            payload: Dict[str, Any] = msg.value.get("payload") or msg.value
            url: Optional[str] = payload.get("url")
            scores: Dict[str, float] = payload.get("scores", {})
            identities: List[str] = payload.get("identity_candidates") or []
            versions: Dict[str, str] = payload.get("model_versions", {})

            fused_raw, contribs = _weighted_score(scores, DETECTOR_WEIGHTS)
            calibrated = _temperature_scale(fused_raw, TEMPERATURE)

            rationale = {
                "detector_scores": scores,
                "detector_versions": versions,
                "weights": DETECTOR_WEIGHTS,
                "contributions": contribs,
                "fusion": "weighted_average",
                "calibration": {"method": "temperature", "T": TEMPERATURE},
            }

            # If identity list empty, still produce a generic decision
            ids = identities if identities else ["unknown"]
            now = time.time()
            for identity_id in ids:
                decision = {
                    "type": "ensemble.decision",
                    "payload": {
                        "identity_id": identity_id,
                        "url": url,
                        "confidence": calibrated,
                        "rationale": rationale,
                        "threshold_used": 0.7,  # demo constant; to be dynamic per identity
                        "calibrated_with": f"temperature:{TEMPERATURE}",
                        "decided_at": now,
                    },
                }
                await _send_kafka(TOPIC_ENSEMBLE_DECISIONS, decision)
            logger.info(f"Emitted ensemble decisions for url={url} identities={len(ids)}")
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
