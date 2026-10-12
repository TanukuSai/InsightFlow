import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_report_generation_and_export(client: AsyncClient, sample_csv_content: bytes):
    headers = {"Authorization": "Bearer dev-token", "X-Workspace-Id": "ws-rep-test"}

    # Import and analyze
    files = {"file": ("feed.csv", sample_csv_content, "text/csv")}
    imp_resp = await client.post("/api/v1/datasets/import", files=files, headers=headers)
    dataset_id = imp_resp.json()["dataset_id"]
    await client.post(f"/api/v1/datasets/{dataset_id}/analysis", json={}, headers=headers)

    # 1. Generate PDF Report
    pdf_payload = {"dataset_id": dataset_id, "format": "pdf", "title": "Quarterly Intelligence Report"}
    pdf_resp = await client.post("/api/v1/reports", json=pdf_payload, headers=headers)
    assert pdf_resp.status_code == 201
    pdf_meta = pdf_resp.json()
    assert pdf_meta["format"] == "pdf"
    assert "download_url" in pdf_meta

    # 2. Download PDF
    pdf_dl = await client.get(pdf_meta["download_url"], headers=headers)
    assert pdf_dl.status_code == 200
    assert pdf_dl.headers["content-type"] == "application/pdf"
    assert len(pdf_dl.content) > 1000  # PDF generated with tables and headings

    # 3. Generate JSON Report
    json_payload = {"dataset_id": dataset_id, "format": "json"}
    json_resp = await client.post("/api/v1/reports", json=json_payload, headers=headers)
    assert json_resp.status_code == 201
    json_meta = json_resp.json()
    json_dl = await client.get(json_meta["download_url"], headers=headers)
    assert json_dl.status_code == 200
    assert "application/json" in json_dl.headers["content-type"]

    # 4. Generate CSV Report
    csv_payload = {"dataset_id": dataset_id, "format": "csv"}
    csv_resp = await client.post("/api/v1/reports", json=csv_payload, headers=headers)
    assert csv_resp.status_code == 201
    csv_meta = csv_resp.json()
    csv_dl = await client.get(csv_meta["download_url"], headers=headers)
    assert csv_dl.status_code == 200
    assert "text/csv" in csv_dl.headers["content-type"]
