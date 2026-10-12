import asyncio
from app.db.session import async_engine
from app.db.base import Base
import app.models  # Ensure all models are registered with Base.metadata
from app.core.logging import logger


async def init_db():
    """
    Creates all defined database tables asynchronously.
    Safe for SQLite, PostgreSQL, and Supabase.
    """
    logger.info("Initializing database tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")


def get_schema_sql() -> str:
    """
    Returns standard PostgreSQL DDL for Supabase migrations.
    """
    return """
-- InsightFlow Supabase PostgreSQL Schema
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    row_count INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    invalid_rows INT DEFAULT 0,
    unique_feedback_count INT DEFAULT 0,
    repeat_feedback_count INT DEFAULT 0,
    category_distribution JSONB DEFAULT '{}'::jsonb,
    has_timestamps BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'imported',
    error_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_datasets_workspace_id ON datasets(workspace_id);

CREATE TABLE IF NOT EXISTS feedbacks (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    dataset_id VARCHAR(64) REFERENCES datasets(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    source_category VARCHAR(128),
    source_timestamp TIMESTAMPTZ,
    source_identifier VARCHAR(128),
    sentiment_label VARCHAR(32),
    sentiment_score FLOAT,
    confidence_score FLOAT,
    primary_topic VARCHAR(128),
    analysis_status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_feedbacks_ws_ds ON feedbacks(workspace_id, dataset_id);
CREATE INDEX IF NOT EXISTS ix_feedbacks_cat_sentiment ON feedbacks(source_category, sentiment_label);

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    dataset_id VARCHAR(64) REFERENCES datasets(id) ON DELETE CASCADE,
    status VARCHAR(32) DEFAULT 'queued',
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    provider VARCHAR(64) DEFAULT 'insightflow-nlp',
    model VARCHAR(64) DEFAULT 'v1.0-hybrid',
    metrics JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_analysis_jobs_ws_ds ON analysis_jobs(workspace_id, dataset_id);

CREATE TABLE IF NOT EXISTS issues (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    dataset_id VARCHAR(64) REFERENCES datasets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    category VARCHAR(128) NOT NULL,
    priority VARCHAR(32) DEFAULT 'Medium',
    priority_explanation TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'open',
    is_tracked BOOLEAN DEFAULT FALSE,
    supporting_count INT DEFAULT 0,
    unique_supporting_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_issues_ws_ds ON issues(workspace_id, dataset_id);
CREATE INDEX IF NOT EXISTS ix_issues_prio_status ON issues(priority, status);

CREATE TABLE IF NOT EXISTS issue_feedback (
    id VARCHAR(64) PRIMARY KEY,
    issue_id VARCHAR(64) REFERENCES issues(id) ON DELETE CASCADE,
    feedback_id VARCHAR(64) REFERENCES feedbacks(id) ON DELETE CASCADE,
    relevance_score FLOAT DEFAULT 1.0,
    excerpt TEXT,
    linked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_issue_feedback_links ON issue_feedback(issue_id, feedback_id);

CREATE TABLE IF NOT EXISTS recommendations (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    issue_id VARCHAR(64) REFERENCES issues(id) ON DELETE CASCADE,
    dataset_id VARCHAR(64) REFERENCES datasets(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    rationale TEXT NOT NULL,
    expected_benefit TEXT,
    priority VARCHAR(32) DEFAULT 'High',
    status VARCHAR(32) DEFAULT 'proposed',
    is_tracked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_recommendations_ws_ds ON recommendations(workspace_id, dataset_id);

CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    dataset_id VARCHAR(64) REFERENCES datasets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    format VARCHAR(16) DEFAULT 'pdf',
    file_path VARCHAR(512),
    parameters JSONB DEFAULT '{}'::jsonb,
    summary_data JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(32) DEFAULT 'ready',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_reports_ws_ds ON reports(workspace_id, dataset_id);

CREATE TABLE IF NOT EXISTS adaption_jobs (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    dataset_id VARCHAR(64) REFERENCES datasets(id) ON DELETE CASCADE,
    adaption_dataset_id VARCHAR(128),
    adaption_run_id VARCHAR(128),
    operation_type VARCHAR(64) DEFAULT 'adapt',
    status VARCHAR(32) DEFAULT 'pending',
    column_mapping JSONB DEFAULT '{}'::jsonb,
    job_specification JSONB DEFAULT '{}'::jsonb,
    estimated_credits FLOAT,
    estimated_minutes FLOAT,
    result_metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_adaption_jobs_ws_ds ON adaption_jobs(workspace_id, dataset_id);
"""


if __name__ == "__main__":
    asyncio.run(init_db())
