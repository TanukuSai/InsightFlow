# InsightFlow — Customer Voice Decision Observatory

**Event**: Build Battle 2026 — AI × Web Development Hackathon  
**Repository**: [TanukuSai/InsightFlow](https://github.com/TanukuSai/InsightFlow)  
**Public Frontend URL**: [https://frontend-bay-ten-95.vercel.app/](https://frontend-bay-ten-95.vercel.app/)  
**Status**: Hackathon Public Demo Ready | 22 Automated Backend Pytest Tests Passing  

---

## 1. Product Scope & Hackathon Demonstration Model

InsightFlow is an evidence-first customer feedback observatory designed for the Build Battle 2026 hackathon. The product scope is streamlined for zero-friction evaluation by judges and public visitors:

- **Zero-Authentication Public Demo**: Visitors access the workspace directly (`ws-production-eval`) without sign-up screens, login forms, or session token barriers.
- **No Scraping or Crawling**: Ingestion is strictly supported via CSV file upload and manual feedback entry. Web scraping, browser automation (Playwright), and social source sync are not included in this runtime scope.
- **Canonical Benchmark Dataset**: Comes preloaded with the official 7,000-row Build Battle contest dataset (`ds-796d15b9a096`), featuring 320 unique exact statements and 6,680 repeated instances.
- **Deterministic Rule-Based Baseline**: Sentiment and keyword classification run via an auditable lexicon baseline (`lexicon-rules-v1.0`) with taxonomy labels `positive`, `neutral`, `negative`, `mixed`, and `unknown`.
- **Verbatim Evidence Linking**: Every identified issue dossier and recommendation links directly to unaltered raw customer quote IDs in the database.
- **Executive Reporting**: Generates server-side executive summary reports with instant downloads in PDF, CSV, and JSON formats.

> [!NOTE]
> **Superseded Historical Architecture**: Any legacy documentation or diagrams in this repository referencing Supabase JWT authentication, multi-tenant workspace isolation, or Playwright automated web scraping represent earlier exploratory design phases and have been superseded by this hackathon public demo model.

---

## 2. Public Demo Protections & Security Controls

Because the public demo workspace is open and shared, the backend enforces server-side controls to protect data integrity and prevent resource exhaustion:

1. **Canonical Dataset Protection**: The canonical contest dataset (`ds-796d15b9a096`) cannot be deleted or wiped. Requests to delete it return `403 Forbidden`.
2. **Deletion Disabled in Public Mode**: Anonymous dataset deletion is disabled in public demo mode (`403 Forbidden`).
3. **Idempotent Auto-Seeding**: On a clean backend deployment, `app.db.seed.seed_canonical_dataset` automatically initializes the workspace and loads `data/BuildBattle_2026_Customer_Feedback_Dataset.csv` if missing, ensuring an immediate judge-ready experience.
4. **Bounded Upload Caps**:
   - Maximum upload file size: **10 MB** (enforced by `MAX_UPLOAD_SIZE_MB`).
   - Maximum CSV row count: **20,000 rows** (enforced by `MAX_CSV_ROWS`).
   - Atomic database rollback and temporary file cleanup on any ingestion error.
5. **Sliding-Window Rate Limiting** (per client IP):
   - CSV Imports: 3 per hour.
   - Analysis Runs: 3 per 10 minutes (concurrent duplicate runs for the same dataset return `409 Conflict`).
   - Report Generation: 5 per hour.
   - Manual Feedback Submissions: 30 per hour.
   - Read APIs: 120 requests per minute.
   - Responses return `429 Too Many Requests` with `Retry-After` headers.
6. **Adaption Cloud Kill Switch**: External Adaption Labs API calls are disabled by default (`ENABLE_PUBLIC_ADAPTION_OPERATIONS=False`). When disabled, endpoints return `403 Forbidden` with an informative message. When enabled, runs are bounded by `ADAPTION_MAX_ROWS=1000` and per-IP rate limits.

> [!WARNING]
> **Shared Public Workspace Notice**: Datasets uploaded and status changes made to issues or recommendations occur in a shared public demo workspace. Upload only sample, public, or anonymized feedback records.

---

## 3. End-to-End User Journey

```
Landing Page (Marketing & Proof)
       │
       ▼
Executive Cockpit (/dashboard) ────► Verbatim Inspection Drawer
       │
       ├──► Feedback Stream (/feedback) — Filter by Category & Search
       │
       ├──► CSV Ingestion (/import) — Upload & Validation (Max 10MB / 20k rows)
       │
       ├──► Issues Triage (/issues) — Evidence Dossiers & Status Management
       │
       ├──► Recommendations (/recommendations) — Grounded Engineering Actions
       │
       └──► Executive Reports (/reports) — Download PDF, CSV, JSON Briefings
```

---

## 4. API Endpoint Reference

All endpoints are served under `/api/v1` and bound server-side to `PUBLIC_DEMO_WORKSPACE_ID`:

| Method | Endpoint | Description | Public Controls |
|---|---|---|---|
| `GET` | `/health` | Health check & DB connectivity probe | Unrestricted |
| `GET` | `/ready` | Application readiness probe | Unrestricted |
| `GET` | `/api/v1/datasets` | List available datasets | Read rate limit |
| `GET` | `/api/v1/datasets/{id}` | Dataset details & category distribution | Read rate limit |
| `POST` | `/api/v1/datasets/import` | Multipart CSV upload & deduplication | Rate limited (3/hr), Max 10MB, Max 20k rows |
| `DELETE` | `/api/v1/datasets/{id}` | Delete dataset | **Disabled in public demo (403 Forbidden)** |
| `GET` | `/api/v1/datasets/{id}/dashboard` | Unified metrics & category distribution | Read rate limit |
| `POST` | `/api/v1/datasets/{id}/analysis` | Trigger rule-based baseline analysis | Rate limited (3/10m), duplicate job lock (409) |
| `GET` | `/api/v1/feedback` | Paginated feedback list & search | Read rate limit |
| `POST` | `/api/v1/feedback` | Submit single feedback record | Rate limited (30/hr) |
| `GET` | `/api/v1/feedback/{id}` | Inspect unaltered verbatim feedback | Read rate limit |
| `GET` | `/api/v1/issues` | List priority issue clusters | Read rate limit |
| `PATCH` | `/api/v1/issues/{id}` | Update issue status or priority | Bounded mutation |
| `GET` | `/api/v1/recommendations` | List action recommendations | Read rate limit |
| `PATCH` | `/api/v1/recommendations/{id}` | Update recommendation implementation status | Bounded mutation |
| `POST` | `/api/v1/reports` | Generate executive briefing | Rate limited (5/hr) |
| `GET` | `/api/v1/reports/{id}/export` | Stream downloaded PDF / CSV / JSON file | Rate limited |
| `GET` | `/api/v1/adaption/status` | Adaption SDK & key status check | Informative status |
| `POST` | `/api/v1/adaption/estimate` | Estimate adaptation credits | **Disabled by default (403 Forbidden)** |
| `POST` | `/api/v1/adaption/jobs` | Launch adaptation job | **Disabled by default (403 Forbidden)** |

---

## 5. Local Development Setup

### Backend (FastAPI + SQLite)
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env

# 4. Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/health`

### Frontend (Next.js 16)
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
# Ensure NEXT_PUBLIC_API_BASE_URL points to backend (e.g. http://127.0.0.1:8000)

# 4. Start development server
npm run dev
```

---

## 6. Testing & Quality Verification

Run the automated backend test suite:
```bash
cd backend
python -m pytest tests -v
```
**Current Test Status**: **22 passed** across:
- `test_adaption.py` — Adaption status, kill switch enforcement (403), key check (503), row cap.
- `test_security.py` — Public demo workspace binding, canonical dataset protection (403), deletion disabled, rate limiting (429).
- `test_csv_import.py` — File upload caps (422), schema validation, duplicate deduplication.
- `test_api_integration.py` — End-to-end dataset lifecycle, feedback browsing, analysis, and report generation.
- `test_issues_recommendations.py` — Evidence linking and status mutation.

Frontend production validation:
```bash
cd frontend
npm run build
```
Builds statically and dynamically with strict TypeScript validation.
