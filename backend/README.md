# InsightFlow Backend

**Event**: Build Battle 2026 — AI × Web Development Hackathon  
**Role**: Complete Backend for InsightFlow Customer Feedback & Decision Platform  
**Status**: Hackathon Public Demo Ready | 22 Automated Backend Pytest Tests Passing  

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
                  │   - Public Demo Workspace Context (Server Bound)        │
                  │   - In-Memory Sliding Window Rate Limiting (Per IP)     │
                  │   - Canonical Dataset Protection (403 on Deletion)      │
                  │   - Bounded Multipart CSV Ingestion Pipeline            │
                  │   - Pydantic v2 Strict Validation Envelopes             │
                  └─────────────┬──────────────────────────┬────────────────┘
                                │                          │
                  ┌─────────────▼──────────┐ ┌─────────────▼────────────────┐
                  │  SQLite / PostgreSQL   │ │     Adaption Labs Official    │
                  │  (Tables, Indexes,     │ │     Python SDK (v0.14.0)     │
                  │   Schema 'insightflow')│ │   - Server-Side Kill Switch   │
                  │   Canonical Auto-Seed  │ │   - Cost & Time Estimations   │
                  │   from data/ CSV       │ │   - Safe 1k Row Caps          │
                  └─────────────┬──────────┘ └──────────────────────────────┘
                                │
                  ┌─────────────▼──────────────────────────┐
                  │          Background Worker Engine      │
                  │   - Rule-Based Baseline Sentiment      │
                  │   - Exact Duplicate Deduplication      │
                  │   - Issue Discovery & Verbatim Linking │
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
- Sentiment score is calibrated between `-1.0` and `+1.0`.

### B. Controlled Adaption Labs Integration
- Integrated using Adaption's actual documented API and official Python SDK (`adaption` v0.14.0).
- **Public Safety Controls**:
  - `ENABLE_PUBLIC_ADAPTION_OPERATIONS=False` by default (returns `403 Forbidden` if called in public mode).
  - Maximum row cap enforced: `ADAPTION_MAX_ROWS=1000`.
  - Rate limited to 3 operations per client IP per hour.
  - Honest status reporting via `/api/v1/adaption/status` (checks SDK and key presence).

### C. Honest Temporal Data Handling
- The hackathon CSV dataset does not include valid review timestamps.
- InsightFlow **never fabricates fake dates** or synthetic historical trend lines.
- Dashboard API explicitly flags `temporal_available: false` with the user-facing notice:
  *"Dataset does not contain valid timestamp data. Historical time-series charts cannot be fabricated."*

### D. Protected Public Demo Workspace
- Single server-side workspace: `PUBLIC_DEMO_WORKSPACE_ID="ws-production-eval"`.
- Canonical Build Battle dataset: `CANONICAL_DATASET_ID="ds-796d15b9a096"` (deletion returns `403 Forbidden`).
- Anonymous dataset deletion is disabled in public demo mode (`403 Forbidden`).
- Auto-seeding on fresh startup: `app.db.seed.seed_canonical_dataset` idempotently initializes the workspace and loads `data/BuildBattle_2026_Customer_Feedback_Dataset.csv` if missing.

---

## 3. Database Schema Design

| Entity | Table Name | Purpose | Key Attributes |
|---|---|---|---|
| **Workspaces** | `workspaces` | Demo workspace container | `id`, `name`, `created_at` |
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
- `POST /api/v1/datasets/import`: Multipart CSV upload with streaming validation, row-level checking, and duplicate statistics (Max 10MB, Max 20k rows, Rate limited: 3/hr).
- `GET /api/v1/datasets`: List all datasets in public demo workspace.
- `GET /api/v1/datasets/{id}`: Detailed dataset statistics and category breakdown.
- `DELETE /api/v1/datasets/{id}`: Disabled in public demo mode (`403 Forbidden`).

### Feedback Records
- `GET /api/v1/feedback`: Paginated feedback browser with search keyword filtering (`?search=`), category filter (`?category=`), sentiment filter (`?sentiment=`), and status filter.
- `POST /api/v1/feedback`: Submit a single feedback entry (Rate limited: 30/hr).
- `GET /api/v1/feedback/{id}`: Retrieve unaltered verbatim feedback quote.

### AI Analysis Pipeline
- `POST /api/v1/datasets/{id}/analysis`: Trigger rule-based baseline analysis (Rate limited: 3/10m, duplicate job lock: `409 Conflict`).
- `GET /api/v1/analysis/{job_id}`: Poll analysis job progress and metrics.

### Executive Dashboard
- `GET /api/v1/datasets/{id}/dashboard`: Unified frontend contract payload containing source metrics, category breakdown, sentiment polarity, prioritized issues, and actionable recommendations.

### Issue Discovery & Tracking
- `GET /api/v1/issues`: List discovered issues filtered by priority, category, or status.
- `GET /api/v1/issues/{id}`: Retrieve issue with supporting feedback evidence excerpts.
- `PATCH /api/v1/issues/{id}`: Update issue status or priority.

### Intelligent Recommendations
- `GET /api/v1/recommendations`: List recommendations linked to issues.
- `PATCH /api/v1/recommendations/{id}`: Update recommendation implementation status.

### Business Reports & Exports
- `POST /api/v1/reports`: Generate report in `pdf`, `json`, or `csv` (Rate limited: 5/hr).
- `GET /api/v1/reports`: List generated reports.
- `GET /api/v1/reports/{id}/export`: Download generated file stream.

### Adaption Labs Integration
- `GET /api/v1/adaption/status`: Check SDK version, API key configuration, and readiness.
- `POST /api/v1/adaption/estimate`: Prepare feedback data and estimate credits (Requires `ENABLE_PUBLIC_ADAPTION_OPERATIONS=True`).
- `POST /api/v1/adaption/jobs`: Launch adaptation job (Requires `ENABLE_PUBLIC_ADAPTION_OPERATIONS=True`).

---

## 5. Local Setup & Testing

### Installation
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

### Running the API Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive docs: `http://localhost:8000/docs`.

### Running the Automated Test Suite
```bash
python -m pytest tests -v
```
All 22 pytest tests pass covering security, CSV import caps, rate limits, Adaption kill switch, and integration workflows.
