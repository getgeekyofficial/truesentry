from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, HttpUrl


# -----------------------
# Identity domain schemas
# -----------------------

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


# -----------------------
# Ingestion/media schemas
# -----------------------

class MediaSubmit(BaseModel):
    url: HttpUrl
    source_hint: Optional[str] = None
    identity_ids: Optional[List[str]] = None


class ForensicsRequest(BaseModel):
    url: HttpUrl
    source_hint: Optional[str] = None
    identity_ids: List[str] = Field(default_factory=list)
    priority: str = "normal"


class ForensicsResult(BaseModel):
    url: HttpUrl
    source_hint: Optional[str] = None
    identity_candidates: List[str] = Field(default_factory=list)
    scores: Dict[str, float] = Field(default_factory=dict)
    model_versions: Dict[str, str] = Field(default_factory=dict)
    processed_at: float


class EnsembleDecision(BaseModel):
    identity_id: str
    url: HttpUrl
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: Dict[str, Any] = Field(default_factory=dict)
    threshold_used: Optional[float] = None
    calibrated_with: Optional[str] = None
    decided_at: float


# -----------------------
# Kafka envelope schemas
# -----------------------

class KafkaEvent(BaseModel):
    type: str
    payload: Dict[str, Any]


class IngestMediaEvent(KafkaEvent):
    type: str = "ingest.media"
    payload: MediaSubmit


class ForensicsRequestEvent(KafkaEvent):
    type: str = "forensics.request"
    payload: ForensicsRequest


class ForensicsResultEvent(KafkaEvent):
    type: str = "forensics.result"
    payload: ForensicsResult


class EnsembleDecisionEvent(KafkaEvent):
    type: str = "ensemble.decision"
    payload: EnsembleDecision
