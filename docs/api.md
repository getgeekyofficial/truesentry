ID-Protect Public API v1

Overview
All endpoints are served behind the API Gateway (FastAPI). Authentication is via API keys (scoped) for programmatic access and OAuth2/OIDC for dashboard users (planned). Responses are JSON. All times are ISO-8601 unless otherwise noted. Confidence scores are probabilistic in [0,1]. No absolute certainty is claimed.

Base URL
- Local (Compose): http://localhost:8000
- Production: https://api.id-protect.example.com

Authentication
- API-Key: Provide header Authorization: Bearer <api_key>
- OAuth2 (planned): Authorization Code flow for dashboard; JWT bearer for service-to-service

Rate Limiting and Idempotency
- Rate limits vary by plan. 429 is returned when exceeded.
- Use Idempotency-Key header for POSTs to ensure safe retries.

Errors
- Standardized error response:
  {
    "error": {
      "code": "string_identifier",
      "message": "Human readable",
      "details": { "optional": "context" }
    }
  }

Endpoints

Health
GET /healthz
- 200: { "status": "ok" }

Identities
POST /v1/identities
- Description: Register a new identity (influencer, public figure). Captures handles, consent, and optional reference media URLs.
- Auth: API key with scope identities:write
- Body:
  {
    "display_name": "Jane Doe",
    "handles": {
      "twitter": "jane",
      "youtube": "janeofficial"
    },
    "consent": {
      "terms_version": "2024-01",
      "signature": "base64-signature-blob"
    },
    "reference_media": [
      "https://signed.example.com/ref1.jpg",
      "https://signed.example.com/ref2.mp4"
    ]
  }
- 202: { "status": "accepted", "message": "Identity creation queued" }

GET /v1/identities/{identity_id}
- Description: Get identity details (identity service serves a similar endpoint internally).
- Auth: API key with scope identities:read
- 200: {
  "id": "id_000001",
  "display_name": "Jane Doe",
  "handles": {
    "twitter": "jane"
  },
  "status": "active"
}

POST /v1/identities/{identity_id}/reference-media
- Description: Add reference media for embedding generation.
- Auth: API key with scope identities:write
- Body:
  {
    "modality": "face",
    "media": [
      "https://signed.example.com/jane_face1.jpg",
      "https://signed.example.com/jane_face2.jpg"
    ]
  }
- 202: { "status": "accepted", "added": 2, "modality": "face" }

Media Submission (Optional Direct Submit)
POST /v1/media/submit
- Description: Submit a piece of media (URL) directly to the pipeline (bypassing connectors).
- Auth: API key with scope media:submit
- Body:
  {
    "url": "https://example.com/suspect_video.mp4",
    "source_hint": "twitter",
    "identity_ids": ["id_000001", "id_000007"]
  }
- 202: { "status": "accepted", "message": "Media submission queued" }

Incidents
GET /v1/incidents
- Description: List incidents for an identity (planned gateway route proxying data store).
- Query: identity_id, status=open|triaged|closed, limit=50
- Auth: API key with scope incidents:read
- 200: {
  "incidents": [
    {
      "id": "inc_123",
      "identity_id": "id_000001",
      "status": "open",
      "severity": "high",
      "summary": "Potential deepfake trending on platform X",
      "created_at": "2024-01-16T12:10:22Z",
      "updated_at": "2024-01-16T12:14:02Z"
    }
  ]
}

GET /v1/incidents/{incident_id}
- Description: Get incident details along with associated media and decisions (planned).
- Auth: API key with scope incidents:read
- 200: {
  "id": "inc_123",
  "identity_id": "id_000001",
  "status": "open",
  "severity": "high",
  "summary": "Potential deepfake trending on platform X",
  "media": [
    {
      "url": "https://example.com/suspect_video.mp4",
      "detections": [
        { "detector_name": "face_vit", "score": 0.74, "model_version": "v1.2.3" }
      ],
      "decision": {
        "confidence": 0.81,
        "threshold_used": 0.7,
        "rationale": {
          "detector_scores": { "face_vit": 0.74, "audio_ast": 0.62 },
          "weights": { "face_vit": 0.25, "audio_ast": 0.25 },
          "contributions": { "face_vit": 0.185, "audio_ast": 0.155 },
          "fusion": "weighted_average",
          "calibration": { "method": "temperature", "T": 1.3 }
        },
        "calibrated_with": "temperature:1.3",
        "decided_at": 1705401252.123
      }
    }
  ],
  "created_at": "2024-01-16T12:10:22Z",
  "updated_at": "2024-01-16T12:14:02Z"
}

Feedback
POST /v1/incidents/{incident_id}/feedback
- Description: Submit a feedback label (true_fake|benign|unknown) for continual learning.
- Auth: API key with scope feedback:write
- Body:
  {
    "label": "true_fake",
    "notes": "Verified by comms team and removed from platform."
  }
- 202: { "status": "accepted" }

Alerts
POST /v1/alerts/test
- Description: Send a test alert to verify channel configuration (planned).
- Auth: API key with scope alerts:write
- Body:
  { "channel": "email", "target": "security@example.com" }
- 202: { "status": "accepted", "preview": true }

WebSocket Streaming
GET /v1/stream?identity_id={id}
- Description: Real-time push of decisions/incidents to dashboard.
- Auth: OAuth2 (dashboard) or API key with scope stream:read
- Messages:
  {
    "type": "ensemble.decision" | "incident.update" | "heartbeat",
    "identity_id": "id_000001",
    "confidence": 0.82,
    "rationale": {...},
    "threshold_used": 0.7,
    "url": "https://example.com/suspect_video.mp4",
    "timestamp": 1705401252.123
  }

Event Contracts (Kafka)

ingest.media
{
  "type": "ingest.media",
  "payload": {
    "url": "https://example.com/suspect_video.mp4",
    "source_hint": "twitter",
    "identity_ids": ["id_000001", "id_000007"]
  }
}

forensics.requests
{
  "type": "forensics.request",
  "payload": {
    "url": "https://example.com/suspect_video.mp4",
    "source_hint": "twitter",
    "identity_ids": ["id_000001"],
    "priority": "normal" // or high/low in future
  }
}

forensics.results
{
  "type": "forensics.result",
  "payload": {
    "url": "https://example.com/suspect_video.mp4",
    "source_hint": "twitter",
    "identity_candidates": ["id_000001"],
    "scores": {
      "face_xception": 0.72,
      "face_vit": 0.75,
      "audio_ast": 0.64,
      "av_sync": 0.51,
      "sensor_prnu": 0.45
    },
    "model_versions": {
      "face_xception": "v1.0.0",
      "face_vit": "v1.0.0"
    },
    "processed_at": 1705401201.312
  }
}

ensemble.decisions
{
  "type": "ensemble.decision",
  "payload": {
    "identity_id": "id_000001", // or "unknown" when no shortlist
    "url": "https://example.com/suspect_video.mp4",
    "confidence": 0.83,
    "rationale": {
      "detector_scores": {...},
      "weights": {...},
      "contributions": {...},
      "fusion": "weighted_average",
      "calibration": { "method": "temperature", "T": 1.3 }
    },
    "threshold_used": 0.7,
    "calibrated_with": "temperature:1.3",
    "decided_at": 1705401222.928
  }
}

Security Notes
- All endpoints must be behind TLS.
- Sensitive actions must be audited (audit_log).
- Access is scoped by account and identity permissions (RBAC + ABAC).
- Webhooks should be signed and validated (HMAC + timestamp, planned).
