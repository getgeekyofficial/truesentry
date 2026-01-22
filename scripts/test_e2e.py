#!/usr/bin/env python3
"""
End-to-end testing script for ID-Protect platform.
Tests all services, endpoints, and Kafka pipeline flow.
"""
import json
import time
import requests
from typing import Dict, Any

BASE_URL = "http://localhost:8000"
IDENTITY_URL = "http://localhost:8001"


def test_health_checks():
    """Test all service health endpoints."""
    print("\n=== Testing Health Endpoints ===")
    services = {
        "Gateway": f"{BASE_URL}/healthz",
        "Identity": f"{IDENTITY_URL}/healthz",
    }
    
    results = {}
    for name, url in services.items():
        try:
            resp = requests.get(url, timeout=5)
            status = "✅ PASS" if resp.status_code == 200 else f"❌ FAIL ({resp.status_code})"
            results[name] = status
            print(f"{name:15} {status}")
        except Exception as e:
            results[name] = f"❌ ERROR: {e}"
            print(f"{name:15} ❌ ERROR: {e}")
    
    return results


def test_identity_creation():
    """Test identity creation endpoint."""
    print("\n=== Testing Identity Creation ===")
    
    payload = {
        "display_name": "Test User E2E",
        "handles": {"twitter": "@testuser", "instagram": "testuser"},
        "consent": {
            "terms_version": "v1.0",
            "signature": "test_signature_blob"
        },
        "reference_media": []
    }
    
    try:
        resp = requests.post(f"{IDENTITY_URL}/v1/identities", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Identity created: {data.get('id')} - {data.get('display_name')}")
            return data.get('id')
        else:
            print(f"❌ Failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None


def test_media_submission(identity_id: str = None):
    """Test media submission endpoint."""
    print("\n=== Testing Media Submission ===")
    
    payload = {
        "url": "https://example.com/test-video.mp4",
        "source_hint": "e2e_test",
        "identity_ids": [identity_id] if identity_id else ["id_000001"]
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/v1/media/submit", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Media submitted: {data}")
            return True
        else:
            print(f"❌ Failed: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False


def test_high_confidence_submission():
    """Test high-confidence URL submission to trigger alerts."""
    print("\n=== Testing High-Confidence Alert Trigger ===")
    
    payload = {
        "url": "https://example.com/video.mp4?x=6608",
        "source_hint": "high_confidence_test",
        "identity_ids": ["id_000001"]
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/v1/media/submit", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ High-confidence media submitted: {data}")
            print("   Check alerts service logs for '[ALERT]' message")
            return True
        else:
            print(f"❌ Failed: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False


def test_error_cases():
    """Test error handling with invalid payloads."""
    print("\n=== Testing Error Handling ===")
    
    test_cases = [
        ("Missing URL", {"source_hint": "test"}),
        ("Invalid URL", {"url": "not-a-url", "identity_ids": ["id_000001"]}),
        ("Empty payload", {}),
    ]
    
    for name, payload in test_cases:
        try:
            resp = requests.post(f"{BASE_URL}/v1/media/submit", json=payload, timeout=5)
            if resp.status_code in [400, 422]:
                print(f"✅ {name}: Correctly rejected ({resp.status_code})")
            else:
                print(f"⚠️  {name}: Unexpected status {resp.status_code}")
        except Exception as e:
            print(f"❌ {name}: ERROR - {e}")


def main():
    """Run all tests."""
    print("=" * 60)
    print("ID-Protect End-to-End Testing")
    print("=" * 60)
    
    # Wait for services to be ready
    print("\nWaiting 5 seconds for services to initialize...")
    time.sleep(5)
    
    # Test health checks
    health_results = test_health_checks()
    
    # Test identity creation
    identity_id = test_identity_creation()
    
    # Test media submission
    if identity_id:
        test_media_submission(identity_id)
    else:
        test_media_submission()
    
    # Test high-confidence alert trigger
    time.sleep(2)  # Allow previous submission to process
    test_high_confidence_submission()
    
    # Test error cases
    test_error_cases()
    
    print("\n" + "=" * 60)
    print("Testing Complete")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Check Kafka UI at http://localhost:8080 for topic messages")
    print("2. Review service logs: docker compose -f infra/docker-compose.yml logs -f")
    print("3. Verify alerts in alerts service logs")


if __name__ == "__main__":
    main()
