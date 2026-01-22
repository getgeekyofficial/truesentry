Model Selection Rationale and Ensemble Design

Goals
- Detect AI-generated or manipulated audio, video, and images under adversarial conditions.
- Produce probabilistic confidence scores with calibration and explanations (not binary claims).
- Achieve robustness via detector diversity and adversarial countermeasures.
- Optimize for latency by gating expensive inference with fast prefilters.

Modalities and Baseline Detectors
1) Face/Image/Video Manipulation
- CNN-based classifiers (XceptionNet/ResNet):
  - Strengths: Good inductive bias for texture/low-level artifacts; strong on FaceForensics++/Celeb-DF.
  - Weaknesses: May overfit to specific artifact distributions if not diversified.
  - Role: Fast-to-medium inference, robust baseline and part of ensemble diversity.
- Vision Transformers (ViT/DeiT) fine-tuned on deepfake datasets:
  - Strengths: Better global context modeling; complements CNN texture bias.
  - Weaknesses: Slightly higher latency; needs careful regularization and augmentation.
  - Role: Balanced accuracy and generalization; core ensemble member.
- Frequency/phase artifacts and Noiseprint-like models:
  - Strengths: Exploit synthesis artifacts in FFT/SRM frequency domains; less sensitive to content semantics.
  - Weaknesses: Sensitive to compression and post-processing; needs a robust preprocessing pipeline.
  - Role: Orthogonal signal; increases ensemble diversity and adversarial robustness.
- Physiologic/landmark signals (auxiliary):
  - Head pose consistency, blink rate, remote PPG (heart-rate) estimation on faces.
  - Role: Auxiliary features for explanations; add weak but interpretable signals.

2) Audio Deepfake Detection
- Spectrogram Transformers (AST/Conformer) on log-mel:
  - Strengths: Strong performance on ASVspoof-like benchmarks; models temporal-spectral patterns.
  - Weaknesses: Model size/latency; needs batching and mixed precision.
  - Role: Primary audio forgery detector in the ensemble.
- Speaker embeddings (ECAPA-TDNN) + spoofing classifier:
  - Strengths: Identity-aware; checks if voice matches enrolled speaker while being real.
  - Weaknesses: Requires high-quality enrollment data; potential bias if enrollment is noisy.
  - Role: Cross-identity check; reduces false attribution and supports identity shortlist.
- CQCC/LFCC baselines:
  - Strengths: Cheap to compute; robust under some compression/codec changes.
  - Weaknesses: Lower standalone accuracy; useful for diversity.
  - Role: Fast prefilters and ensemble diversity.

3) Cross-modal Consistency
- AV Sync (SyncNet-like):
  - Strengths: Detects audio-visual lip-sync discrepancies.
  - Weaknesses: Degraded performance with occlusions; requires face-track extraction.
  - Role: Critical when face and voice are present; adds interpretable signals.
- Voice-face identity consistency:
  - Map speaker embedding to face identity space (via learned metric or co-embedding).
  - Role: Rejects content where the visible person and the speaker mismatch.

4) Sensor/Compression Artifact Analysis
- PRNU/Noiseprint:
  - Strengths: Capture camera sensor fingerprint inconsistencies; useful to flag splicing.
  - Weaknesses: Requires high-quality media; sensitive to heavy compression.
  - Role: Additional signal for tampering; useful for provenance analysis.
- Codec/JPEG artifacts and metadata:
  - Strengths: Lightweight; catches re-encoding and container anomalies.
  - Weaknesses: High false positives if used alone.
  - Role: Prefiltering, risk heuristics, and report explanations.

Ensemble and Calibration
Fusion Strategy
- Weighted average or shallow MLP/stacked logistic regression over per-detector probabilities.
- Detector weights informed by validation AUC/ECE and dataset coverage; maintained in a registry (MLflow).
- Detector diversity prioritized to reduce correlated failures.

Calibration
- Per-detector calibration: temperature scaling or isotonic regression on validation split; tracked by MLflow.
- Ensemble-level calibration: another round of temperature scaling/isotonic regression; reliability diagrams monitored.
- Expected Calibration Error (ECE) tracked; service-level SLO e.g. ECE < 0.05 on rolling windows.

Selective Prediction and Abstention
- Conformal prediction (roadmap): compute p-values and abstain on low-conformity samples.
- Policy: escalate to human when confidence in [0.4, 0.7] or when detectors disagree significantly.

Latency Strategy
- Prefiltering:
  - Keyword/handle triggers; face detection with fast models; ANN shortlist from reference face/voice embeddings.
  - Perceptual hashes and dedup to avoid re-processing virally duplicated content.
- Early exit gates:
  - Run light/cheap detectors to form preliminary risk; proceed to heavy models only if risk exceeds gate.
- GPU serving:
  - Batch across items, mixed precision, optional Triton for multi-model serving, stream priority by risk.

Adversarial Robustness
- Test-time randomized transformations (jpeg, blur, color jitter, resampling) with aggregation to reduce brittle patterns.
- Feature squeezing and spectrum domain augmentations to counter adversarial perturbations.
- Adversarial training of shallow heads; robustness checks in CI with synthetic attacks.
- Ensemble diversity across architectures, modalities, and preprocessing domains.

Identity Shortlisting
- For faces: ArcFace/FaceNet embeddings for enrolled identities in pgvector; candidate shortlist reduces N x M cost.
- For voices: ECAPA/Resemblyzer-style embeddings to match candidate speakers.
- Effect: limits heavy cross-modal checks to a small set of plausible identities; reduces latency and costs.

Data and Continual Learning
- Feedback loops:
  - Human labels (true_fake/benign/unknown) feed back into dataset curation.
  - Hard negative mining and domain adaptation for new platform artifacts.
- Model Registry:
  - MLflow model versions; A/B or canary deploys; rollbacks upon drift detection.
- Evaluation:
  - Per-identity, per-platform, and overall slices tracked for fairness and performance.

Privacy and Bias Considerations
- Store embeddings/fingerprints with envelope encryption; minimize raw media retention.
- Per-identity thresholds/policies to reduce harm from misclassification; human-in-loop on sensitive incidents.
- Audit and explanation:
  - Provide detector score breakdowns and key contributing features.
  - Avoid overconfident claims; present calibrated probabilities and caveats.

Initial Detector Set (v0)
- Face: Xception baseline + ViT-lite
- Audio: AST-lite + ECAPA-identity consistency head
- Cross-modal: SyncNet-lite (lip-sync)
- Artifacts: JPEG/codec heuristics + noiseprint-lite
- Ensemble: Weighted average + temperature scaling (T≈1.3) with reliability reports

Upgrade Path (v1+)
- Add diffusion-specific artifacts detectors and synthetic data augmentations.
- Introduce conformal prediction and abstention workflows.
- Triton-based multi-model serving with dynamic batching and priority queues.
- Robust provenance signals (C2PA/Content Credentials) when available.
