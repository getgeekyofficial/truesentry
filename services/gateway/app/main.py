import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl

# Optional Kafka dependency
try:
    from aiokafka import AIOKafkaProducer
except Exception:  # pragma: no cover
    AIOKafkaProducer = None  # type: ignore


# ------------------------------------------------------------------------------
# Config & Logging
# ------------------------------------------------------------------------------

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
IDENTITY_SERVICE_URL = os.getenv("IDENTITY_SERVICE_URL", "http://identity:8001")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("gateway")


# ------------------------------------------------------------------------------
# Models
# ------------------------------------------------------------------------------

class Consent(BaseModel):
    terms_version: str = Field(..., description="Accepted terms version identifier")
    signature: str = Field(..., description="User consent signature blob")


class IdentityCreate(BaseModel):
    display_name: str
    handles: Dict[str, str] = Field(default_factory=dict, description="platform -> handle")
    consent: Consent
    reference_media: List[HttpUrl] = Field(
        default_factory=list, description="Signed URLs to initial reference media"
    )


class MediaSubmit(BaseModel):
    url: HttpUrl
    source_hint: Optional[str] = None
    identity_ids: Optional[List[str]] = None


# ------------------------------------------------------------------------------
# App Lifecycle with Kafka Producer (optional)
# ------------------------------------------------------------------------------

class AppState:
    kafka_producer: Optional["AIOKafkaProducer"] = None


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if AIOKafkaProducer is not None:
        try:
            producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
            await producer.start()
            app_state.kafka_producer = producer
            logger.info("Kafka producer started")
        except Exception as e:  # pragma: no cover
            logger.warning(f"Kafka unavailable or failed to start producer: {e}")
            app_state.kafka_producer = None
    else:  # pragma: no cover
        logger.warning("aiokafka not installed; running without Kafka producer")

    yield

    # Shutdown
    if app_state.kafka_producer is not None:
        try:
            await app_state.kafka_producer.stop()
            logger.info("Kafka producer stopped")
        except Exception as e:  # pragma: no cover
            logger.warning(f"Failed to stop Kafka producer cleanly: {e}")


app = FastAPI(
    title="ID Protect Gateway",
    version="0.1.0",
    description="API Gateway for real-time digital identity protection &amp; deepfake detection",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Dependencies and Utilities
# ------------------------------------------------------------------------------

async def kafka_producer_dep() -> Optional["AIOKafkaProducer"]:
    return app_state.kafka_producer


async def _kafka_send(topic: str, payload: Dict[str, Any], producer: Optional["AIOKafkaProducer"]) -> None:
    if producer is None:
        logger.info(f"[DRY-RUN] Kafka send to {topic}: {payload}")
        return
    data = json.dumps(payload, default=str).encode("utf-8")
    await producer.send_and_wait(topic, data)


# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/v1/identities")
async def create_identity(
    body: IdentityCreate,
    producer: Optional["AIOKafkaProducer"] = Depends(kafka_producer_dep),
):
    """
    Accepts identity registration and emits an event for the Identity Service.
    """
    event = {
        "type": "identity.create",
        "payload": body.model_dump(),
    }
    await _kafka_send("identity.requests", event, producer)
    # Return 202 to indicate async processing; client can poll incidents/identities
    return {"status": "accepted", "message": "Identity creation queued"}


@app.post("/v1/media/submit")
async def submit_media(
    body: MediaSubmit,
    producer: Optional["AIOKafkaProducer"] = Depends(kafka_producer_dep),
):
    """
    Accepts direct media submissions and enqueues for ingestion/forensics.
    """
    event = {
        "type": "ingest.media",
        "payload": body.model_dump(),
    }
    await _kafka_send("ingest.media", event, producer)
    return {"status": "accepted", "message": "Media submission queued"}


# ------------------------------------------------------------------------------
# WebSocket for real-time incidents/decisions
# ------------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self) -> None:
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, identity_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.setdefault(identity_id, []).append(websocket)
        logger.info(f"WS connected: identity={identity_id}, total={len(self.active[identity_id])}")

    def disconnect(self, identity_id: str, websocket: WebSocket) -> None:
        conns = self.active.get(identity_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns and identity_id in self.active:
            self.active.pop(identity_id, None)
        logger.info(f"WS disconnected: identity={identity_id}")

    async def broadcast(self, identity_id: str, message: Dict[str, Any]) -> None:
        conns = self.active.get(identity_id, [])
        stale: List[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(identity_id, ws)


manager = ConnectionManager()


@app.websocket("/v1/stream")
async def stream_incidents(ws: WebSocket):
    """
    Client connects with query param ?identity_id=... to receive real-time updates.
    """
    identity_id = ws.query_params.get("identity_id")
    if not identity_id:
        await ws.close(code=1008)  # policy violation
        return

    await manager.connect(identity_id, ws)

    # Demo pinger: in production, consume ensemble.decisions and stream
    async def _demo_pinger():
        # This simulates periodic updates so UI can be tested before Kafka wiring.
        try:
            while True:
                await asyncio.sleep(10)
                msg = {
                    "type": "heartbeat",
                    "identity_id": identity_id,
                    "timestamp": asyncio.get_event_loop().time(),
                }
                await manager.broadcast(identity_id, msg)
        except asyncio.CancelledError:
            pass

    pinger = asyncio.create_task(_demo_pinger())

    try:
        while True:
            _ = await ws.receive_text()  # keepalive or client messages
            # Optionally process client message
    except WebSocketDisconnect:
        manager.disconnect(identity_id, ws)
    finally:
        pinger.cancel()


# ------------------------------------------------------------------------------
# Security Notes (to be implemented)
# ------------------------------------------------------------------------------
# - OAuth2/OIDC for dashboard users, API key auth for programmatic access
# - RBAC + ABAC for identity-scoped access
# - Request signing for webhooks
# - Rate limiting and abuse prevention
# - mTLS between internal services (non-dev)
# - Audit logging across privileged routes


# ------------------------------------------------------------------------------
# Run (for local uvicorn without Docker)
# ------------------------------------------------------------------------------

if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
