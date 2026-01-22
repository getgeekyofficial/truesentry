# ID-Protect Deployment Guide

## Quick Start (Docker Compose)

### Prerequisites
- Docker Desktop 4.x+ with Compose V2
- 8GB+ RAM available
- Ports available: 5432, 8000, 8080, 9000-9001, 9092, 9094

### 1. Start Infrastructure Only

```bash
cd id-protect/infra
docker compose up -d postgres kafka kafka-ui minio
```

**Wait ~30 seconds for services to be healthy:**

```bash
docker compose ps
```

Expected output:
- postgres: healthy
- kafka: healthy  
- kafka-ui: running
- minio: healthy

### 2. Verify Infrastructure

**Postgres + pgvector:**
```bash
docker exec -it idprotect-postgres psql -U idprotect -d idprotect -c "\dx"
```
Should show: uuid-ossp, vector extensions

**Kafka:**
```bash
docker exec -it idprotect-kafka rpk cluster info
```
Should show broker available

**MinIO:**
```bash
docker exec -it idprotect-minio mc ls local/idprotect
```
Should show bucket exists

**Access UIs:**
- Kafka UI: http://localhost:8080
- MinIO Console: http://localhost:9001 (user: idprotect / pass: idprotect_secret)

### 3. Start Application Services

```bash
docker compose --profile app up -d --build
```

This builds and starts:
- gateway (port 8000)
- identity (internal)
- ingestion (internal)
- forensics (internal)
- ensemble (internal)
- alerts (internal)

**Check status:**
```bash
docker compose ps
docker compose logs -f gateway
```

### 4. Test End-to-End

**Health check:**
```bash
curl http://localhost:8000/healthz
```

**Create identity:**
```bash
curl -X POST http://localhost:8000/v1/identities \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Alice",
    "handles": {"twitter": "@alice"},
    "consent": {"terms_version": "v1.0", "signature": "sig"},
    "reference_media": []
  }'
```

**Submit media for detection:**
```bash
curl -X POST http://localhost:8000/v1/media/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/video.mp4",
    "source_hint": "test",
    "identity_ids": ["id_000001"]
  }'
```

**Monitor Kafka pipeline:**
```bash
# View topics in Kafka UI: http://localhost:8080
# Or via CLI:
docker exec -it idprotect-kafka rpk topic list
docker exec -it idprotect-kafka rpk topic consume ingest.media --num 1
```

**Check service logs:**
```bash
docker compose logs -f ingestion forensics ensemble alerts
```

Expected flow:
1. Gateway → `ingest.media` topic
2. Ingestion → `forensics.requests` topic
3. Forensics → `forensics.results` topic (with detector scores)
4. Ensemble → `ensemble.decisions` topic (with calibrated confidence)
5. Alerts → logs decision (triggers alert if confidence >= threshold)

---

## Local Development (uvicorn)

For faster iteration during development, run services locally with hot reload:

### 1. Start Infrastructure
```bash
cd id-protect/infra
docker compose up -d postgres kafka kafka-ui minio
```

### 2. Install Python Dependencies
```bash
cd id-protect
python -m venv .venv
.venv\Scripts\activate  # Windows
# or: source .venv/bin/activate  # Linux/Mac

pip install -r services/gateway/requirements.txt
pip install -r services/identity/requirements.txt
pip install -r services/ingestion/requirements.txt
pip install -r services/forensics/requirements.txt
pip install -r services/ensemble/requirements.txt
pip install -r services/alerts/requirements.txt
```

### 3. Run Services (separate terminals)

**Gateway:**
```bash
cd services/gateway
set KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9094  # Windows
# export KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9094  # Linux/Mac
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Identity:**
```bash
cd services/identity
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Ingestion:**
```bash
cd services/ingestion
set KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9094
uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload
```

**Forensics:**
```bash
cd services/forensics
set KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9094
uvicorn app.main:app --host 0.0.0.0 --port 8012 --reload
```

**Ensemble:**
```bash
cd services/ensemble
set KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9094
uvicorn app.main:app --host 0.0.0.0 --port 8013 --reload
```

**Alerts:**
```bash
cd services/alerts
set KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9094
uvicorn app.main:app --host 0.0.0.0 --port 8014 --reload
```

**Note:** Use external Kafka listener (127.0.0.1:9094) for host access, internal (kafka:9092) for container-to-container.

---

## Configuration

### Environment Variables

**Gateway:**
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka brokers (default: localhost:9092)
- `ALLOWED_ORIGINS`: CORS origins (default: *)
- `LOG_LEVEL`: Logging level (default: INFO)

**Forensics:**
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka brokers
- `S3_ENDPOINT_URL`: MinIO endpoint (default: http://minio:9000)
- `S3_ACCESS_KEY`: MinIO access key
- `S3_SECRET_KEY`: MinIO secret key

**Ensemble:**
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka brokers
- `CALIBRATION_TEMPERATURE`: Temperature scaling (default: 1.3)

**Alerts:**
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka brokers
- `ALERT_THRESHOLD`: Confidence threshold (default: 0.7)
- `SENDGRID_API_KEY`: Email alerts (optional)
- `TWILIO_ACCOUNT_SID`: SMS alerts (optional)
- `TWILIO_AUTH_TOKEN`: SMS alerts (optional)

### Kafka Topics

- `ingest.media`: Media submissions from gateway
- `forensics.requests`: Requests to forensics service
- `forensics.results`: Detector scores and features
- `ensemble.decisions`: Calibrated confidence and rationale
- `alerts.outbound`: Alert notifications (future)

---

## Troubleshooting

### Kafka Connection Errors

**Symptom:** `KafkaConnectionError` or `RequestTimedOutError`

**Solution:**
```bash
docker restart idprotect-kafka
# Wait 15 seconds
docker compose ps
```

### Port Conflicts

**Symptom:** `port is already allocated`

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :8000  # Windows
# lsof -i :8000  # Linux/Mac

# Stop conflicting service or change port in docker-compose.yml
```

### Service Won't Start

**Check logs:**
```bash
docker compose logs <service-name>
```

**Rebuild:**
```bash
docker compose --profile app up -d --build --force-recreate
```

### Database Connection Issues

**Verify Postgres:**
```bash
docker exec -it idprotect-postgres pg_isready -U idprotect
```

**Reset database:**
```bash
docker compose down -v  # WARNING: Deletes all data
docker compose up -d postgres
```

---

## Production Deployment (Kubernetes)

### Prerequisites
- Kubernetes cluster 1.25+
- Helm 3.x
- kubectl configured

### Helm Chart Structure (to be created)

```
id-protect-helm/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── gateway-deployment.yaml
│   ├── identity-deployment.yaml
│   ├── ingestion-deployment.yaml
│   ├── forensics-deployment.yaml
│   ├── ensemble-deployment.yaml
│   ├── alerts-deployment.yaml
│   ├── postgres-statefulset.yaml
│   ├── kafka-statefulset.yaml
│   ├── minio-statefulset.yaml
│   ├── services.yaml
│   ├── ingress.yaml
│   ├── configmaps.yaml
│   └── secrets.yaml
```

### Key Production Considerations

1. **Secrets Management:**
   - Use External Secrets Operator
   - Integrate with AWS Secrets Manager / GCP Secret Manager / Azure Key Vault

2. **Autoscaling:**
   - HorizontalPodAutoscaler for all services
   - Cluster Autoscaler for node pools
   - GPU node pools for forensics service

3. **Observability:**
   - Prometheus ServiceMonitors
   - Grafana dashboards
   - OpenTelemetry collector
   - ELK/OpenSearch for logs

4. **Security:**
   - Network policies
   - Pod security policies
   - mTLS via service mesh (Istio/Linkerd)
   - Image scanning (Trivy)

5. **High Availability:**
   - Multi-replica deployments
   - Pod disruption budgets
   - Anti-affinity rules
   - Multi-AZ distribution

---

## Monitoring & Observability

### Metrics (to be implemented)

**Service-level:**
- Request rate, latency (P50/P95/P99), error rate
- Kafka consumer lag
- Queue depth

**Business-level:**
- Identities registered
- Media submissions per hour
- Detections triggered
- Alerts sent
- False positive rate

### Logs

**Structured logging format:**
```json
{
  "timestamp": "2026-01-20T12:00:00Z",
  "level": "INFO",
  "service": "forensics",
  "message": "Processed media",
  "url": "https://...",
  "identity_id": "id_000001",
  "confidence": 0.85,
  "latency_ms": 234
}
```

**Access logs:**
```bash
docker compose logs -f gateway | grep "POST /v1/media/submit"
```

### Alerts (Prometheus rules - to be created)

- High consumer lag (> 1000 messages)
- Service down (health check failing)
- High error rate (> 5%)
- Slow response time (P95 > 2s)
- Low disk space (< 10%)

---

## Backup & Recovery

### Database Backups

**Manual backup:**
```bash
docker exec idprotect-postgres pg_dump -U idprotect idprotect > backup.sql
```

**Restore:**
```bash
cat backup.sql | docker exec -i idprotect-postgres psql -U idprotect idprotect
```

### MinIO Backups

**Export bucket:**
```bash
docker exec idprotect-minio mc mirror local/idprotect /backup/idprotect
```

### Kafka Topic Backups

**Export topic:**
```bash
docker exec idprotect-kafka rpk topic consume ingest.media --num -1 > topic-backup.json
```

---

## Performance Tuning

### Kafka

- Increase partitions for high-throughput topics
- Tune `batch.size` and `linger.ms` for producers
- Adjust `fetch.min.bytes` for consumers

### Postgres

- Tune `shared_buffers`, `effective_cache_size`
- Add indexes on frequently queried columns
- Use connection pooling (PgBouncer)

### Forensics Service

- Batch inference (current: 1, tune to 8-16)
- Mixed precision (FP16)
- Model quantization
- GPU memory optimization

---

## Security Hardening

### Network

- Restrict ingress to gateway only
- Internal services on private network
- TLS for all external traffic
- mTLS for inter-service communication

### Authentication

- Implement OAuth2/OIDC for dashboard
- API key rotation policy
- Rate limiting per key
- IP allowlisting for admin endpoints

### Data Protection

- Encrypt data at rest (database, object storage)
- Encrypt data in transit (TLS 1.3)
- Envelope encryption for biometric embeddings
- Secure key management (KMS)

### Compliance

- GDPR: Data minimization, right to erasure, consent tracking
- Audit logs: Immutable, tamper-evident
- Data retention policies
- Privacy impact assessments

---

## Cost Optimization

### Compute

- Use spot instances for non-critical workloads
- Autoscale down during off-peak hours
- Right-size instance types

### Storage

- S3 lifecycle policies (transition to Glacier)
- Compress old logs
- Delete expired media

### Kafka

- Tune retention policies
- Use compression (snappy/lz4)
- Compact topics where applicable

---

## Support & Maintenance

### Health Checks

All services expose `/healthz` endpoint returning:
```json
{"status": "ok"}
```

### Graceful Shutdown

Services handle SIGTERM for graceful shutdown:
1. Stop accepting new requests
2. Finish processing in-flight requests
3. Close Kafka consumers
4. Exit

### Rolling Updates

```bash
# Update image
docker compose --profile app up -d --no-deps --build <service>

# Kubernetes
kubectl rollout restart deployment/<service>
kubectl rollout status deployment/<service>
```

---

## FAQ

**Q: How do I add a new detector?**
A: Update `services/forensics/app/main.py`, add detector logic, rebuild image.

**Q: How do I change the alert threshold?**
A: Set `ALERT_THRESHOLD` environment variable for alerts service.

**Q: How do I scale forensics service?**
A: Increase replicas in docker-compose or K8s deployment. Kafka will distribute load.

**Q: How do I add a new Kafka topic?**
A: Topics are auto-created on first produce. For production, pre-create with desired config.

**Q: How do I integrate with external platforms (Twitter, TikTok)?**
A: Implement connectors in `services/ingestion/app/connectors/`. Use official APIs or webhooks.

---

## Next Steps

1. **Implement DB Integration:** Wire identity service to Postgres
2. **Add S3 Operations:** Media upload/download via MinIO
3. **WebSocket Streaming:** Real-time dashboard updates
4. **Authentication:** OAuth2/OIDC and API keys
5. **Observability:** Prometheus metrics, Grafana dashboards
6. **ML Models:** Replace deterministic scoring with real detectors
7. **Continual Learning:** Feedback loop and retraining pipeline
8. **Production Hardening:** Security, compliance, performance tuning

---

For questions or issues, refer to:
- Architecture: `docs/architecture.md`
- API Reference: `docs/api.md`
- Model Rationale: `docs/model-rationale.md`
- Test Results: `TEST_RESULTS.md`
