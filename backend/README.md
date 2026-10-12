# InsightFlow Backend

**Event**: Build Battle 2026 — AI × Web Development Hackathon  
**Role**: Complete Backend for InsightFlow Customer Feedback & Decision Platform  
**Status**: Production & Demo Ready | 100% Automated Test Coverage Passed  

---

## 1. System Architecture Overview

InsightFlow transforms unstructured customer feedback into structured intelligence, recurring complaint clusters, evidence-backed issues, and actionable business recommendations.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 Next.js Frontend Client                 │
                  └────────────────────────────┬────────────────────────────┘
                                               │ HTTP / REST / JSON
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │            FastAPI Gateway Layer (/api/v1)              │
                  │   - Auth / Workspace Isolation (Supabase JWT Claims)    │
                  │   - Bounded Multipart CSV Ingestion Pipeline            │
                  │   - Pydantic v2 Strict Validation Envelopes             │
                  └─────────────┬──────────────────────────┬────────────────┘
                                │                          │
                  ┌─────────────▼──────────┐ ┌─────────────▼────────────────┐
                  │  PostgreSQL / Supabase │ │     Adaption Labs Official    │
                  │  (Tables, Indexes,     │ │     Python SDK (v0.14.0)     │
                  │   Schema 'insightflow')│ │   - Adaptive Data Workflow   │
                  │   or SQLite (Local)    │ │   - Cost & Time Estimations  │
                  └─────────────┬──────────┘ │   - Data Optimization Runs   │
                                │            └──────────────────────────────┘
                  ┌─────────────▼──────────────────────────┐
                  │          Background Worker Engine      │
                  │   - Lexical & Semantic Sentiment Class.│
                  │   - Complaint Grouping & Issue Linking │
                  │   - Recommendation & Evidence Synthesis│
                  │   - Multi-format PDF / CSV / JSON Rep. │
                  └────────────────────────────────────────┘
```

---

## 2. Core Architectural Decisions

### A. Strict Separation of Source Categories & Derived Sentiment
- **Rule**: Source category labels (`Operational Issues`, `Fraud and Scam`, `Product Feedback`, `Customer Service`) from the raw dataset are **never** treated as sentiment.
- **Implementation**: Upon CSV ingestion, `sentiment_label`, `sentiment_score`, and `confidence_score` remain explicitly `null` (`analysis_status: "pending"`).
- Sentiment is only classified when the analysis pipeline runs, using an explicit taxonomy:
  `positive`, `neutral`, `negative`, `mixed`, `unknown`.
- Sentiment score is calibrated between `-1.0` and `+1.0`, while model confidence is calibrated `0.0` to `1.0`.

### B. Real Adaption Labs Integration
- **Rule**: Integrated using Adaption's actual documented API and official Python SDK (`adaption` v0.14.0).
- **Adaptive Data Workflow**:
  1. Exports customer feedback into standardized columns (`instruction` as prompt, `input` as context category).
  2. Uploads to Adaption via `client.datasets.upload_file(...)`.
  3. Awaits asynchronous platform ingestion confirmation via `client.datasets.get_status(...)`.
  4. Calculates pre-flight credit & duration quotes with `client.datasets.adapt(..., estimate=True)`.
  5. Launches optimization runs with `client.datasets.adapt(..., estimate=False)`.
  6. Tracks run progress and stores external `dataset_id` and `run_id` in database.
- **Graceful Error Handling**: If `ADAPTION_API_KEY` is missing or the external service times out, an honest error message is logged and returned without fabricating fake success.

### C. Honest Temporal Data Handling
- The hackathon CSV dataset does not include valid review timestamps.
- **Rule**: InsightFlow **never fabricates fake dates** or synthetic historical trend lines.
- Dashboard API explicitly flags `temporal_available: false` with the user-facing notice:
  *"Dataset does not contain valid timestamp data. Historical time-series charts cannot be fabricated."*

---

## 3. Database Schema Design

All tables are created under the `insightflow` schema in Supabase PostgreSQL (or SQLite locally):

| Entity | Table Name | Purpose | Key Attributes |
|---|---|---|---|
| **Workspaces** | `workspaces` | Multi-tenant isolation | `id`, `name`, `created_at` |
| **Datasets** | `datasets` | Ingested datasets & metadata | `id`, `workspace_id`, `row_count`, `valid_rows`, `unique_feedback_count`, `repeat_feedback_count`, `category_distribution` |
| **Feedback** | `feedbacks` | Individual customer reviews | `id`, `dataset_id`, `original_text`, `source_category`, `sentiment_label`, `sentiment_score`, `primary_topic` |
| **Analysis Jobs** | `analysis_jobs` | Durable async analysis tracking | `id`, `status` (queued/running/succeeded/failed), `total_items`, `processed_items`, `metrics` |
| **Issues** | `issues` | Recurring complaint clusters | `id`, `title`, `summary`, `priority` (Critical/High/Medium/Low), `priority_explanation`, `supporting_count`, `unique_supporting_count`, `is_tracked` |
| **Issue Evidence** | `issue_feedback` | Many-to-many evidence link | `issue_id`, `feedback_id`, `relevance_score`, `excerpt`, `linked_at` |
| **Recommendations** | `recommendations` | Evidence-based strategic actions | `id`, `issue_id`, `action`, `rationale`, `expected_benefit`, `priority`, `status`, `is_tracked` |
| **Reports** | `reports` | Multi-format executive exports | `id`, `dataset_id`, `format` (pdf/json/csv), `file_path`, `summary_data` |
| **Adaption Jobs** | `adaption_jobs` | Persisted Adaption Labs runs | `id`, `dataset_id`, `adaption_dataset_id`, `adaption_run_id`, `operation_type`, `estimated_credits`, `status` |

---

## 4. REST API Endpoint Reference

All routes are versioned under `/api/v1`.

### Health & Readiness
- `GET /health`: System health and database connectivity probe.
- `GET /ready`: Readiness check.

### Datasets & Ingestion
- `POST /api/v1/datasets/import`: Multipart CSV upload with streaming validation, row-level checking, and duplicate statistics.
- `GET /api/v1/datasets`: List all datasets scoped to the caller's workspace.
- `GET /api/v1/datasets/{id}`: Detailed dataset statistics and category breakdown.
- `DELETE /api/v1/datasets/{id}`: Cascade deletion of dataset and associated records.
- `GET /api/v1/imports/{id}`: Poll status of an import job.

### Feedback Records
- `GET /api/v1/feedback`: Paginated feedback browser with search keyword filtering (`?search=`), category filter (`?category=`), sentiment filter (`?sentiment=`), and status filter.
- `POST /api/v1/feedback`: Submit a single feedback entry.
- `GET /api/v1/feedback/{id}`: Retrieve single feedback details.
- `PATCH /api/v1/feedback/{id}`: Update review category or metadata.

### AI Analysis Pipeline
- `POST /api/v1/datasets/{id}/analysis`: Asynchronously trigger sentiment classification, topic extraction, issue clustering, and recommendation generation.
- `GET /api/v1/analysis/{job_id}`: Poll analysis job progress and metrics.
- `POST /api/v1/analysis/{job_id}/retry`: Safely retry a failed analysis run.

### Executive Dashboard
- `GET /api/v1/datasets/{id}/dashboard`: Unified frontend contract payload containing:
  - Source metrics (total rows: 7,000, unique exact: 320, repeated: 6,680).
  - Source category distribution.
  - Sentiment distribution & average score (only after analysis has executed).
  - Top prioritized issues with supporting counts.
  - Actionable recommendations.
  - Sample recent reviews in source order.
  - Limitations and temporal availability flags.

### Issue Discovery & Tracking
- `GET /api/v1/issues`: List discovered issues filtered by priority, category, or status.
- `GET /api/v1/issues/{id}`: Retrieve issue with supporting feedback evidence excerpts.
- `PATCH /api/v1/issues/{id}`: Human review update (modify status or priority).
- `POST /api/v1/issues/{id}/track`: Add issue to saved tracking list.
- `DELETE /api/v1/issues/{id}/track`: Untrack issue.

### Intelligent Recommendations
- `GET /api/v1/recommendations`: List recommendations linked to issues.
- `GET /api/v1/recommendations/{id}`: Detailed view of a recommendation.
- `PATCH /api/v1/recommendations/{id}`: Update implementation status.
- `POST /api/v1/recommendations/{id}/track`: Track recommendation.

### Business Reports & Exports
- `POST /api/v1/reports`: Generate report in `pdf`, `json`, or `csv`.
- `GET /api/v1/reports`: List generated reports.
- `GET /api/v1/reports/{id}`: Retrieve report metadata and summary data.
- `GET /api/v1/reports/{id}/export`: Download generated file (PDF stream, CSV, or JSON).

### Adaption Labs Integration
- `GET /api/v1/adaption/status`: Check SDK version, API key configuration, and readiness.
- `POST /api/v1/adaption/estimate`: Prepare feedback data, upload to Adaption, and calculate credit/time quote without billing.
- `POST /api/v1/adaption/jobs`: Start live adaptation run on Adaption Labs platform.
- `GET /api/v1/adaption/jobs/{id}`: Poll status of local & upstream Adaption job.
- `GET /api/v1/adaption/jobs`: List all Adaption jobs in workspace.

---

## 5. Local Setup & Execution Guide

### Prerequisites
- Python 3.11+ (Python 3.14 verified)
- Git

### Installation
```bash
# 1. Clone repository and navigate to backend
cd backend

# 2. Install dependencies
pip install -r requirements.txt
```

### Environment Configuration
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
APP_ENV=development
DATABASE_URL=sqlite+aiosqlite:///./insightflow.db
SUPABASE_URL=https://ulqysmxopkkizydttqqp.supabase.co
ADAPTION_API_KEY=pt_live_your_key_here
```

### Running the API Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation is live at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

### Running the Automated Test Suite
```bash
pytest tests -v
```

---

## 6. Frontend Integration Contract

The backend provides a standardized JSON contract designed for modern React / Next.js interfaces:

```json
{
  "dataset_id": "ds-796d15b9a096",
  "dataset_name": "Build Battle 2026 Hackathon Dataset",
  "total_source_rows": 7000,
  "unique_exact_statements": 320,
  "repeated_rows": 6680,
  "has_timestamps": false,
  "temporal_available": false,
  "temporal_message": "Dataset does not contain valid timestamp data. Historical trend charts are unavailable.",
  "analysis_status": "completed",
  "source_category_distribution": {
    "Operational Issues": 1800,
    "Fraud and Scam": 1755,
    "Product Feedback": 1738,
    "Customer Service": 1707
  },
  "sentiment_distribution": {
    "positive": 2260,
    "neutral": 2573,
    "negative": 2141,
    "mixed": 26,
    "unknown": 0,
    "total_analyzed": 7000
  },
  "average_sentiment_score": 0.02,
  "top_recurring_issues": [
    {
      "id": "iss-04cf7457ef0c",
      "title": "Systemic Risk: Fraud & Payment Scams",
      "summary": "Identified 1755 customer reports (35 distinct statements) detailing fraudulent interactions and suspicious seller payment demands.",
      "category": "Fraud and Scam",
      "priority": "Critical",
      "priority_explanation": "Direct risk of customer financial loss and severe trust erosion. Immediate intervention required.",
      "supporting_count": 1755,
      "unique_supporting_count": 35,
      "is_tracked": false
    }
  ]
}
```

---

## 7. Performance Benchmarks

Tested with the real **7,000-row** customer feedback hackathon dataset:
- **CSV Ingestion & Batch Storage**: 0.90s
- **AI Sentiment & Topic Classification**: 1.23s
- **Evidence Clustering & Recommendations**: Instantaneous (< 0.1s)
- **Executive PDF Report Generation**: 0.23s
- **Test Suite Execution (15 tests)**: 1.83s
