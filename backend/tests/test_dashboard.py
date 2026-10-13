import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_unanalysed_dataset(client: AsyncClient, sample_csv_content: bytes):
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    # Dashboard check before analysis
    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard")
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["dataset_id"] == dataset_id
    assert data["total_source_rows"] == 5
    assert data["valid_rows"] == 5
    assert data["valid_feedback_count"] == 5
    assert data["invalid_rows"] == 0
    assert data["unique_exact_statements"] == 4
    assert data["distinct_comment_texts"] == 4
    assert data["repeated_rows"] == 1
    assert data["extra_duplicate_occurrences"] == 1
    assert data["extra_duplicate_copies"] == 1
    assert data["rows_in_repeated_groups"] == 2
    assert data["comments_in_repeated_groups"] == 2
    assert data["total_categorized_rows"] == 5
    assert data["has_timestamps"] is False
    assert data["temporal_available"] is False
    assert "unavailable" in data["temporal_message"].lower()

    # Crucial assertion: Sentiment must NOT exist before analysis!
    assert data["sentiment_distribution"] is None
    assert data["average_sentiment_score"] is None
    assert data["analysis_status"] == "unanalysed"

    # Category counts must come from source category
    assert data["source_category_distribution"]["Operational Issues"] == 2
    assert data["source_category_distribution"]["Fraud and Scam"] == 1

    # Check top_repeated_statements contains extra_duplicates
    assert len(data["top_repeated_statements"]) == 1
    rep = data["top_repeated_statements"][0]
    assert rep["count"] == 2
    assert rep["extra_duplicates"] == 1
    assert rep["dataset_share_pct"] == 40.0  # 2 / 5 = 40.0% of valid


@pytest.mark.asyncio
async def test_dashboard_part_a_rigorous_calculation_fixtures(client: AsyncClient):
    """
    Required fixture from prompt Part A:
    5 source rows, 1 invalid, 4 valid comments, 3 distinct exact texts, one duplicate extra copy.
    The duplicate-excess rate must be 1 / 4 = 25% of valid comments, not 1 / 5 = 20% of source rows.
    """
    csv_content = (
        "review,category\n"
        "Comment One,Category A\n"
        "   ,Category A\n"  # 1 invalid row
        "Comment Two,Category B\n"
        "Comment Three,Category C\n"
        "Comment One,Category A\n"  # duplicate of Comment One
    ).encode("utf-8")

    files = {"file": ("part_a_fixture.csv", csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    assert imp_resp.status_code == 201
    dataset_id = imp_resp.json()["dataset_id"]

    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard")
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["total_source_rows"] == 5
    assert data["valid_rows"] == 4
    assert data["valid_feedback_count"] == 4
    assert data["invalid_rows"] == 1
    assert data["invalid_source_rows"] == 1
    assert data["distinct_comment_texts"] == 3
    assert data["extra_duplicate_copies"] == 1
    assert data["rows_in_repeated_groups"] == 2

    # Excess duplicate rate = 1 / 4 = 25% of valid comments
    excess_rate = (data["extra_duplicate_copies"] / data["valid_rows"]) * 100
    assert excess_rate == 25.0

    assert len(data["top_repeated_statements"]) == 1
    rep = data["top_repeated_statements"][0]
    assert rep["statement"] == "Comment One"
    assert rep["count"] == 2
    assert rep["extra_duplicates"] == 1
    assert rep["dataset_share_pct"] == 50.0  # 2 / 4 valid = 50%


@pytest.mark.asyncio
async def test_dashboard_text_appearing_three_times(client: AsyncClient):
    """
    Required fixture from prompt Part A:
    A text appearing 3 times: total appearances are 3, additional duplicate copies are 2,
    and all 3 comments belong to a repeated-text group.
    """
    csv_content = (
        "review,category\n"
        "Repeated Thrice Text,Customer Service\n"
        "Repeated Thrice Text,Customer Service\n"
        "Repeated Thrice Text,Customer Service\n"
        "Unique Single,Product Feedback\n"
    ).encode("utf-8")

    files = {"file": ("thrice.csv", csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard")
    data = dash_resp.json()

    assert data["valid_rows"] == 4
    assert data["distinct_comment_texts"] == 2
    assert data["extra_duplicate_copies"] == 2
    assert data["comments_in_repeated_groups"] == 3

    rep = data["top_repeated_statements"][0]
    assert rep["count"] == 3
    assert rep["extra_duplicates"] == 2
    assert rep["dataset_share_pct"] == 75.0


@pytest.mark.asyncio
async def test_dashboard_multi_category_repeated_text(client: AsyncClient):
    """
    If an exact text occurs under multiple imported categories,
    the repeated statement category must show 'Multiple categories'.
    """
    csv_content = (
        "review,category\n"
        "Identical Phrasing Across Teams,Customer Service\n"
        "Identical Phrasing Across Teams,Operational Issues\n"
    ).encode("utf-8")

    files = {"file": ("multi_cat_rep.csv", csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard")
    data = dash_resp.json()

    assert len(data["top_repeated_statements"]) == 1
    rep = data["top_repeated_statements"][0]
    assert rep["category"] == "Multiple categories"


@pytest.mark.asyncio
async def test_dashboard_after_analysis(client: AsyncClient, sample_csv_content: bytes):
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files)
    dataset_id = imp_resp.json()["dataset_id"]

    # Analyze
    await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={})

    # Dashboard check
    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard")
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["sentiment_distribution"] is not None
    assert data["sentiment_distribution"]["total_analyzed"] == 5
    assert data["sentiment_coverage_pct"] == 100.0
    assert data["average_sentiment_score"] is not None
    assert len(data["top_recurring_issues"]) > 0
    assert len(data["top_recommendations"]) > 0

    # Ensure rule-based phrasing is present in limitations and issues
    assert any("rule-based" in lim.lower() for lim in data["limitations"])
    critical_or_high_issues = [iss for iss in data["top_recurring_issues"] if iss["priority"] in ["Critical", "High"]]
    if critical_or_high_issues:
        assert "rule-based triage flag" in critical_or_high_issues[0]["priority_explanation"].lower()
