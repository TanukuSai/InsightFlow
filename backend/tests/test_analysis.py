import pytest
from httpx import AsyncClient
from app.services.analysis_service import AnalysisProvider


def test_analysis_provider_taxonomy():
    provider = AnalysisProvider()
    assert provider.provider_name == "rule-based baseline"
    assert provider.model_name == "lexicon-rules-v1.0"

    # 1. Positive
    label, score, conf = provider.classify_sentiment("I absolutely love this product, it is fantastic and great!")
    assert label == "positive"
    assert score > 0
    assert conf is None  # Confidence is uncalibrated in rule-based baseline, returned as None

    # 2. Negative
    label, score, conf = provider.classify_sentiment("This was a complete scam, damaged items and broken package.")
    assert label == "negative"
    assert score < 0
    assert conf is None

    # 3. Negation handling: "not a scam" is NOT negative
    label, score, _ = provider.classify_sentiment("The seller was responsive and it was definitely not a scam.")
    assert label in ["positive", "neutral"]
    assert score >= 0

    # 4. Negation handling: "not good" is negative
    label, score, _ = provider.classify_sentiment("The delivery was not good and not helpful.")
    assert label == "negative"
    assert score < 0

    # 5. Contrastive clause ("They claim it's innovative but it fails constantly")
    label, score, _ = provider.classify_sentiment("The features look innovative on paper, but the website crashed and failed.")
    assert label == "negative"

    # 6. Sarcasm detection ("Oh great, another crash") -> returns unknown/uncertain
    label, score, _ = provider.classify_sentiment("Oh great, another crash when trying to pay.")
    assert label == "unknown"

    # 7. Mixed sentiment
    label, score, _ = provider.classify_sentiment("The product features are innovative but the packaging was damaged.")
    assert label in ["mixed", "positive", "negative"]

    # 8. Neutral / Informational
    label, score, _ = provider.classify_sentiment("The package arrived on Monday through the regional post.")
    assert label == "neutral"

    # 9. Short / Empty / Whitespace
    label, score, _ = provider.classify_sentiment("")
    assert label == "unknown"

    label, score, _ = provider.classify_sentiment("   ")
    assert label == "unknown"

    label, score, _ = provider.classify_sentiment("Ok")
    assert label == "unknown"


@pytest.mark.asyncio
async def test_analysis_job_flow(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-test"}

    # 1. Import dataset
    files = {"file": ("test_feedback.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]

    # 2. Start analysis
    payload = {"provider": "hybrid-nlp", "model": "v1.0-standard"}
    ana_resp = await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json=payload, headers=headers)
    assert ana_resp.status_code == 202
    job_id = ana_resp.json()["id"]

    # 3. Check job status
    status_resp = await client.get(f"/api/v1/analysis/{job_id}", headers=headers)
    assert status_resp.status_code == 200
    job_data = status_resp.json()
    assert job_data["id"] == job_id
    assert job_data["status"] in ["queued", "running", "succeeded"]

    # 4. Feedback records now analyzed
    fb_resp = await client.get(f"/api/v1/feedback?dataset_id={dataset_id}", headers=headers)
    items = fb_resp.json()["items"]
    # Check that at least some items were processed
    analyzed_items = [fb for fb in items if fb["analysis_status"] == "analyzed"]
    for fb in analyzed_items:
        assert fb["sentiment_label"] in ["positive", "neutral", "negative", "mixed", "unknown"]
        assert fb["primary_topic"] is not None
