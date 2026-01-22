import logging
import os
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("identity")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(
    title="ID Protect Identity Service",
    version="0.1.0",
    description="Manages identities, reference media, and biometric embeddings (scaffold)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Models (scaffold)
# ------------------------------------------------------------------------------

class Consent(BaseModel):
    terms_version: str
    signature: str


class IdentityCreate(BaseModel):
    display_name: str
    handles: Dict[str, str] = Field(default_factory=dict)
    consent: Consent
    reference_media: List[HttpUrl] = Field(default_factory=list)


class ReferenceMediaAdd(BaseModel):
    modality: str = Field(..., description="face|voice|motion")
    media: List[HttpUrl]


class Identity(BaseModel):
    id: str
    display_name: str
    handles: Dict[str, str]
    status: str = "pending"


# ------------------------------------------------------------------------------
# In-memory store (placeholder for DB)
# ------------------------------------------------------------------------------

IDENTITIES: Dict[str, Identity] = {}


# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/v1/identities", response_model=Identity)
async def create_identity(body: IdentityCreate):
    """
    Creates identity (scaffold). In production, create DB rows, keys, and enqueue embedding jobs.
    """
    identity_id = f"id_{len(IDENTITIES)+1:06d}"
    ident = Identity(id=identity_id, display_name=body.display_name, handles=body.handles)
    IDENTITIES[identity_id] = ident
    logger.info(f"Created identity {identity_id} for {body.display_name}")
    return ident


@app.get("/v1/identities/{identity_id}", response_model=Identity)
async def get_identity(identity_id: str):
    ident = IDENTITIES.get(identity_id)
    if not ident:
        raise HTTPException(status_code=404, detail="Not found")
    return ident


@app.post("/v1/identities/{identity_id}/reference-media")
async def add_reference_media(identity_id: str, body: ReferenceMediaAdd):
    """
    Adds reference media for an identity (scaffold).
    In production: download to object storage, compute embeddings, store encrypted vectors.
    """
    if identity_id not in IDENTITIES:
        raise HTTPException(status_code=404, detail="Identity not found")
    logger.info(f"Add reference media ({body.modality}) for {identity_id}: {len(body.media)} items")
    return {"status": "accepted", "added": len(body.media), "modality": body.modality}
