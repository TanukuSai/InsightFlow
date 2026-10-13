import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_unanalysed_dataset(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-dash-test"}

    # Import
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]

    # Dashboard check before analysis
    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["dataset_id"] == dataset_id
    assert data["total_source_rows"] == 5
    assert data["valid_rows"] == 5
    assert data["invalid_rows"] == 0
    assert data["unique_exact_statements"] == 4
    assert data["repeated_rows"] == 1
    assert data["extra_duplicate_occurrences"] == 1
    assert data["rows_in_repeated_groups"] == 2
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


@pytest.mark.asyncio
async def test_dashboard_with_invalid_rows(client: AsyncClient):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-dash-invalid-rows"}

    # CSV with 6 non-header lines: 4 valid, 2 blank/invalid
    csv_content = (
        "review,category\n"
        "App crashed during checkout,Operational Issues\n"
        "   ,Operational Issues\n"  # blank review
        "Seller charged extra fee outside platform,Fraud and Scam\n"
        ",Customer Service\n"  # blank review
        "Great speed and performance,Product Feedback\n"
        "App crashed during checkout,Operational Issues\n"  # repeat
    ).encode("utf-8")

    files = {"file": ("with_invalids.csv", csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    assert imp_resp.status_code == 201
    dataset_id = imp_resp.json()["dataset_id"]

    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["total_source_rows"] == 6
    assert data["valid_rows"] == 4
    assert data["invalid_rows"] == 2
    assert data["unique_exact_statements"] == 3
    assert data["extra_duplicate_occurrences"] == 1
    assert data["rows_in_repeated_groups"] == 2
    assert data["total_categorized_rows"] == 4
    # Ensure category sum matches valid_rows, not total_source_rows
    assert sum(data["source_category_distribution"].values()) == 4


@pytest.mark.asyncio
async def test_dashboard_no_duplicates(client: AsyncClient):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-dash-no-dups"}

    csv_content = (
        "review,category\n"
        "Unique comment number 1,Product Feedback\n"
        "Unique comment number 2,Customer Service\n"
        "Unique comment number 3,Operational Issues\n"
    ).encode("utf-8")

    files = {"file": ("no_dups.csv", csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    assert imp_resp.status_code == 201
    dataset_id = imp_resp.json()["dataset_id"]

    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["total_source_rows"] == 3
    assert data["valid_rows"] == 3
    assert data["unique_exact_statements"] == 3
    assert data["extra_duplicate_occurrences"] == 0
    assert data["rows_in_repeated_groups"] == 0
    assert data["top_repeated_statements"] == []


@pytest.mark.asyncio
async def test_dashboard_multiple_repeated_statement_groups(client: AsyncClient):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-dash-multi-dups"}

    # Comment A appears 3 times (2 extra duplicates)
    # Comment B appears 2 times (1 extra duplicate)
    # Comment C appears 1 time (0 extra duplicates)
    # Total valid: 6 rows
    # Distinct texts: 3
    # Extra duplicates: 3
    # Rows in repeated groups: 5
    csv_content = (
        "review,category\n"
        "Comment A,Product Feedback\n"
        "Comment A,Product Feedback\n"
        "Comment A,Product Feedback\n"
        "Comment B,Operational Issues\n"
        "Comment B,Operational Issues\n"
        "Comment C,Customer Service\n"
    ).encode("utf-8")

    files = {"file": ("multi_dups.csv", csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    assert imp_resp.status_code == 201
    dataset_id = imp_resp.json()["dataset_id"]

    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["valid_rows"] == 6
    assert data["unique_exact_statements"] == 3
    assert data["extra_duplicate_occurrences"] == 3
    assert data["rows_in_repeated_groups"] == 5
    assert len(data["top_repeated_statements"]) == 2

    first_rep = data["top_repeated_statements"][0]
    assert first_rep["statement"] == "Comment A"
    assert first_rep["count"] == 3
    assert first_rep["extra_duplicates"] == 2

    second_rep = data["top_repeated_statements"][1]
    assert second_rep["statement"] == "Comment B"
    assert second_rep["count"] == 2
    assert second_rep["extra_duplicates"] == 1


@pytest.mark.asyncio
async def test_dashboard_after_analysis(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-dash-analyzed"}

    # Import
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]

    # Analyze
    await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={}, headers=headers)

    # Dashboard check
    dash_resp = await client.get(f"/api/v1/datasets/{dataset_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["sentiment_distribution"] is not None
    assert data["sentiment_distribution"]["total_analyzed"] > 0
    assert data["average_sentiment_score"] is not None
    assert len(data["top_recurring_issues"]) > 0
    assert len(data["top_recommendations"]) > 0

    # Ensure rule-based phrasing is present in limitations and issues
    assert any("rule-based" in lim.lower() for lim in data["limitations"])
    critical_or_high_issues = [iss for iss in data["top_recurring_issues"] if iss["priority"] in ["Critical", "High"]]
    if critical_or_high_issues:
        assert "rule-based classification" in critical_or_high_issues[0]["priority_explanation"].lower()
