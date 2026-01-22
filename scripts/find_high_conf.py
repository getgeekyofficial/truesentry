import hashlib
import math
import random
import sys
from typing import Dict, Tuple

# Replicate forensics + ensemble logic

WEIGHTS: Dict[str, float] = {
    "face_xception": 0.25,
    "face_vit": 0.25,
    "audio_ast": 0.25,
    "av_sync": 0.15,
    "sensor_prnu": 0.10,
}
BIASES: Dict[str, float] = {
    "face_xception": 0.00,
    "face_vit": 0.02,
    "audio_ast": -0.01,
    "av_sync": 0.00,
    "sensor_prnu": 0.00,
}

def deterministic_score(seed: str, name: str, bias: float = 0.0) -> float:
    h = hashlib.sha256((seed + "::" + name).encode("utf-8")).digest()
    v = int.from_bytes(h[:8], "big")
    x = (v % 10_000_000) / 10_000_000.0
    x = min(max(x + bias, 0.0), 1.0)
    return x

def fuse_scores(seed: str) -> Tuple[float, Dict[str, float]]:
    s = 0.0
    tw = 0.0
    scores: Dict[str, float] = {}
    for n, w in WEIGHTS.items():
        sc = deterministic_score(seed, n, BIASES[n])
        scores[n] = sc
        s += w * sc
        tw += w
    if tw <= 0:
        return 0.0, scores
    return s / tw, scores

def temperature_scale(p: float, t: float) -> float:
    p = min(max(float(p), 0.0), 1.0)
    if t <= 1e-6:
        return p
    eps = 1e-6
    logit = (p + eps) / (1.0 - p + eps)
    logit = max(logit, eps)
    scaled_logit = logit ** (1.0 / t)
    scaled_p = scaled_logit / (1.0 + scaled_logit)
    return float(min(max(scaled_p, 0.0), 1.0))

def search(base: str, iters: int = 5000, t_values=(1.3, 0.1)):
    best = {t: (-1.0, "") for t in t_values}
    for i in range(iters):
        seed = f"{base}?x={i}"
        raw, _ = fuse_scores(seed)
        for t in t_values:
            cal = temperature_scale(raw, t)
            if cal > best[t][0]:
                best[t] = (cal, seed)
    return best

if __name__ == "__main__":
    base = "https://example.com/video.mp4"
    iters = 10000
    if len(sys.argv) > 1:
        base = sys.argv[1]
    if len(sys.argv) > 2:
        iters = int(sys.argv[2])

    results = search(base, iters=iters, t_values=(1.3, 0.1))
    for t, (score, seed) in results.items():
        print(f"T={t}: best_conf={score:.6f} url={seed}")
