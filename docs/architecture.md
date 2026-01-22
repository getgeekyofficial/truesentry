ID-Protect Architecture

Overview
A modular, cloud-native SaaS platform for real-time digital identity protection and deepfake detection. The system ingests internet media, performs multi-modal forensics, fuses detector outputs via a calibrated ensemble, triggers alerts and workflows, and learns continuously from user feedback. It is adversary-aware, privacy-by-design, and scales horizontally.

Core Services
- Gateway (FastAPI): Public API, authN/Z (roadmap), rate limiting, WebSocket notifier for real-time updates. Produces ingestion requests to Kafka.
- Identity Service (FastAPI): Secure onboarding, reference media ingestion, biometric embedding pipelines (envelope encryption), identity metadata management.
- Ingestion (FastAPI): Connectors, crawlers, webhooks, reverse image/video search integration, deduplication, enrichment, prioritization. Produces forensics requests.
- Forensics (FastAPI + PyTorch): GPU-enabled detectors for face/image/video/audio, sensor/compression artifacts, cross-modal checks. Emits per-detector scores with metadata.
- Ensemble (FastAPI): Score fusion via weighted stacking; calibration (temperature, isotonic). Produces calibrated confidence with rationale.
- Alerts (FastAPI): Consumes decisions; creates incidents; dispatches alerts via email/SMS/webhook; generates reports; evidence hashing/timestamping. 
- Dashboard (React/TS): Identity timelines, incidents, explanations, response workflows, feedback.

Data Plane
- Postgres + pgvector: Relational storage and ANN embeddings (initially).
- S3-compatible object storage (MinIO): Raw media (optional), derived artifacts, reports, hashes.
- Kafka (KRaft): Streaming backbone for decoupled, scalable processing.
- MLflow: Model registry, metrics, experiments.

Security and Compliance
- End-to-end encryption; envelope encryption for embeddings; per-identity DEKs, KEK in KMS.
- mTLS between internal services (prod), API keys/OIDC, RBAC/ABAC, rate limiting.
- Audit logs and evidence chain preservation (hashing, timestamping).
- GDPR privacy-by-design: data minimization, configurable retention, DSAR support.

Mermaid: Service and Data Flow
```mermaid
flowchart LR
  subgraph External
    U[Users/Dashboard] -->|HTTPS| GW
    PP[Platforms/APIs] --> ING
  end

  subgraph Core
    GW[Gateway API]
    ID[Identity Service]
    ING[Ingestion]
    FR[Forensics<br/>(GPU)]
    EN[Ensemble]
    AL[Alerts]
  end

  subgraph Infra
    PG[(Postgres + pgvector)]
    S3[(MinIO S3)]
    KF[(Kafka)]
    MF[(MLflow)]
  end

  GW -- POST /v1/identities --> ID
  GW -- POST /v1/media/submit --> KF
  GW -- WebSocket --> U

  ID -- embeddings, metadata --> PG
  ID -- reference media --> S3

  KF <-- ingest.media --> GW
  ING <-- ingest.media --> KF
  ING -->|forensics.requests| KF
  FR <-- forensics.requests --> KF
  FR -->|forensics.results| KF
  EN <-- forensics.results --> KF
  EN -->|ensemble.decisions| KF
  AL <-- ensemble.decisions --> KF
  AL --> PG

  ING --> PG
  FR --> PG
  EN --> PG

  FR --> S3
  AL --> S3

  FR -. model logs .-> MF
  EN -. calibration logs .-> MF
```

Kafka Topics (initial)
- ingest.media: media submissions from gateway or connectors
- forensics.requests: normalized media units for detector evaluation
- forensics.results: per-detector scores and metadata
- ensemble.decisions: fused, calibrated confidence with rationale
- identity.requests (optional): identity lifecycle events (created, updated)
- alerts.outbound (optional): ready-to-dispatch alert payloads
- deadletter.*: failures at each stage

Storage Entities (selected)
- accounts, users, api_keys
- identities, identity_keys
- biometric_embeddings (pgvector)
- media_events, detections, ensemble_decisions
- incidents, incident_media, alerts, feedback
- audit_log, billing_events

Detection Stack (baseline)
- Face manipulation detection:
  - CNN (Xception/ResNet) fine-tuned on deepfake datasets
  - ViT-based model for generalization
  - Frequency/phase artifacts (FFT/SRM), camera noise patterns
- Audio deepfake detection:
  - Spectrogram transformer (AST/Conformer) on log-mel
  - ECAPA-TDNN speaker embeddings + spoof classifier
  - CQCC/LFCC baselines for diversity
- Cross-modal:
  - SyncNet-style AV sync
  - Voice-face identity consistency (speaker vs face embeddings)
- Artifacts & metadata:
  - PRNU/noiseprint
  - JPEG/codec artifacts
  - Container metadata sanity checks

Ensemble & Calibration
- Fusion via weighted average or shallow MLP/stacked LR
- Calibration:
  - Temperature scaling and/or isotonic regression
  - Reliability diagrams and Expected Calibration Error (ECE) tracking
- Selective prediction via conformal prediction (roadmap) to abstain under uncertainty
- Per-identity thresholds and policies driven by risk profile and label history

Latency and Scale Strategy
- Prefiltering:
  - Keyword/handle triggers, ANN shortlist via embeddings, perceptual hashing
- Early exits:
  - Lightweight detectors first; gate expensive models
- GPU performance:
  - Batching, mixed precision, Triton serving (optional), stream priority
- Backpressure:
  - Kafka consumer groups, partitioning by identity/platform, deadletter queues
- Horizontal scaling:
  - Separate autoscaling knobs per service; GPU pools for forensics

Security Architecture
- Authentication:
  - OIDC for user dashboard
  - API keys with scopes for programmatic access
- Authorization:
  - RBAC + ABAC; identity-scoped checks
- Transport:
  - TLS for external; mTLS for internal
- Data protection:
  - Envelope encryption for embeddings
  - S3 SSE for artifacts; optional client-side
- Evidence integrity:
  - SHA-256 hashing, RFC3161 timestamping
  - Immutable audit_log entries

Compliance and Privacy
- Data minimization default; opt-in for raw media storage
- Retention policies by plan/contract; purge workflows
- DSAR (access/export/erase) endpoints and operational runbooks
- Audit trail for critical actions; access controls for sensitive datasets

Deployment
- Local: Docker Compose (Postgres+pgvector, Kafka, S3/MinIO, MLflow, services)
- Production: Kubernetes with GPU nodes for forensics
  - Ingress with TLS + WAF, HPA, Cluster Autoscaler
  - Secrets via external secrets operator to cloud KMS/Vault
  - Observability via OpenTelemetry, Prometheus, Grafana, logs

SLOs (initial)
- End-to-end P95 decision latency: < 8s for hot-path viral content
- Forensics GPU utilization target: 60-75%
- Calibration ECE: < 0.05 on validation/rolling windows
- Availability: Gateway 99.9%, Forensics 99.5%

Roadmap Enhancements
- Advanced adversarial defenses (randomized smoothing, adversarial training)
- Additional platform connectors and webhooks
- Automatic takedown package submission for selected platforms
- Continual learning with active sampling and human-in-the-loop UI
