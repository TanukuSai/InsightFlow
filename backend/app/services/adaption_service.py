import os
import uuid
import csv
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.adaption import AdaptionJob
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.core.config import settings
from app.core.logging import logger

try:
    from adaption import Adaption
    import adaption
    ADAPTION_SDK_VERSION = getattr(adaption, "__version__", "0.14.0")
    ADAPTION_AVAILABLE = True
except ImportError:
    ADAPTION_AVAILABLE = False
    ADAPTION_SDK_VERSION = "none"


class AdaptionService:
    @staticmethod
    def get_client() -> Optional[Any]:
        if not settings.ADAPTION_API_KEY:
            return None
        if not ADAPTION_AVAILABLE:
            return None
        return Adaption(api_key=settings.ADAPTION_API_KEY, timeout=60.0)

    @staticmethod
    def check_status() -> Dict[str, Any]:
        key_configured = bool(settings.ADAPTION_API_KEY and len(settings.ADAPTION_API_KEY) > 10)
        prefix = settings.ADAPTION_API_KEY[:8] + "..." if key_configured else None

        return {
            "configured": key_configured and ADAPTION_AVAILABLE,
            "api_key_set": key_configured,
            "key_prefix": prefix,
            "sdk_version": ADAPTION_SDK_VERSION,
            "public_operations_enabled": settings.ENABLE_PUBLIC_ADAPTION_OPERATIONS,
            "message": (
                "Adaption Labs SDK initialized and ready for Adaptive Data workflows."
                if key_configured and settings.ENABLE_PUBLIC_ADAPTION_OPERATIONS
                else (
                    "Adaption external cloud operations are disabled in public demo mode. Set ENABLE_PUBLIC_ADAPTION_OPERATIONS=true in .env to enable."
                    if key_configured
                    else "ADAPTION_API_KEY is not set. Set it in .env with ENABLE_PUBLIC_ADAPTION_OPERATIONS=true to enable dataset optimization."
                )
            ),
        }

    @staticmethod
    async def prepare_adaption_csv(
        dataset_id: str,
        workspace_id: str,
        db: AsyncSession,
        max_rows: int = 5000,
    ) -> str:
        """
        Prepares a clean, standard CSV mapped for Adaption Adaptive Data:
        columns: instruction (prompt), input (context category), output (completion if applicable)
        """
        query = select(Feedback).where(
            Feedback.dataset_id == dataset_id,
            Feedback.workspace_id == workspace_id,
        ).limit(max_rows)
        res = await db.execute(query)
        feedbacks = res.scalars().all()

        export_path = os.path.join(settings.DATA_DIR, f"adaption_input_{dataset_id}.csv")
        with open(export_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["instruction", "input", "category"])
            for fb in feedbacks:
                writer.writerow([
                    fb.original_text,
                    f"Category: {fb.source_category or 'General'}",
                    fb.source_category or "General",
                ])

        return export_path

    @staticmethod
    async def run_estimate(
        dataset_id: str,
        workspace_id: str,
        column_mapping: Optional[Dict[str, Any]],
        max_rows: int,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        client = AdaptionService.get_client()
        local_job_id = f"adj-{uuid.uuid4().hex[:12]}"

        # Default standard mapping for customer feedback
        mapping = column_mapping or {
            "prompt": "instruction",
            "context": ["input"],
        }
        spec = {"max_rows": max_rows}

        if not client:
            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                operation_type="estimate",
                status="failed",
                column_mapping=mapping,
                job_specification=spec,
                error_message="ADAPTION_API_KEY is not configured.",
            )
            db.add(job)
            await db.commit()
            raise ValueError("ADAPTION_API_KEY is not configured. Please supply a valid key.")

        try:
            # Prepare export file
            csv_path = await AdaptionService.prepare_adaption_csv(dataset_id, workspace_id, db, max_rows=max_rows)

            logger.info(f"Uploading file {csv_path} to Adaption Labs...")
            uploaded = client.datasets.upload_file(csv_path)
            adaption_ds_id = uploaded.dataset_id

            logger.info(f"Waiting for Adaption dataset {adaption_ds_id} to complete ingestion...")
            import asyncio
            for _ in range(30):
                st = client.datasets.get_status(adaption_ds_id)
                if getattr(st, "row_count", None) is not None:
                    break
                if getattr(st, "status", None) == "failed":
                    break
                await asyncio.sleep(2)

            logger.info(f"Requesting adaptation estimate for Adaption dataset {adaption_ds_id}...")
            estimate = client.datasets.adapt(
                adaption_ds_id,
                column_mapping=mapping,
                job_specification=spec,
                estimate=True,
            )

            est_credits = getattr(estimate, "estimated_credits_consumed", 0.0) or 0.0
            est_minutes = getattr(estimate, "estimated_minutes", 0.0) or 0.0
            run_id = getattr(estimate, "run_id", None)

            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                adaption_dataset_id=adaption_ds_id,
                adaption_run_id=run_id,
                operation_type="estimate",
                status="succeeded",
                column_mapping=mapping,
                job_specification=spec,
                estimated_credits=float(est_credits),
                estimated_minutes=float(est_minutes),
                result_metadata={
                    "estimate": True,
                    "raw_response": str(estimate),
                },
                completed_at=datetime.now(timezone.utc),
            )
            db.add(job)
            await db.commit()

            return {
                "local_job_id": local_job_id,
                "dataset_id": dataset_id,
                "adaption_dataset_id": adaption_ds_id,
                "estimated_credits": float(est_credits),
                "estimated_minutes": float(est_minutes),
                "column_mapping_used": mapping,
                "message": "Adaptation estimate calculated successfully from Adaption Labs.",
            }
        except Exception as e:
            logger.error(f"Adaption estimate error: {e}")
            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                operation_type="estimate",
                status="failed",
                column_mapping=mapping,
                job_specification=spec,
                error_message=str(e),
                completed_at=datetime.now(timezone.utc),
            )
            db.add(job)
            await db.commit()
            raise RuntimeError(f"Adaption API error: {str(e)}")

    @staticmethod
    async def start_adaptation_run(
        dataset_id: str,
        workspace_id: str,
        column_mapping: Optional[Dict[str, Any]],
        job_specification: Optional[Dict[str, Any]],
        db: AsyncSession,
    ) -> AdaptionJob:
        client = AdaptionService.get_client()
        local_job_id = f"adj-{uuid.uuid4().hex[:12]}"

        mapping = column_mapping or {
            "prompt": "instruction",
            "context": ["input"],
        }
        spec = job_specification or {"max_rows": 5000}

        if not client:
            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                operation_type="adapt",
                status="failed",
                column_mapping=mapping,
                job_specification=spec,
                error_message="ADAPTION_API_KEY is not configured.",
            )
            db.add(job)
            await db.commit()
            raise ValueError("ADAPTION_API_KEY is not configured.")

        try:
            csv_path = await AdaptionService.prepare_adaption_csv(dataset_id, workspace_id, db, max_rows=spec.get("max_rows", 5000))
            uploaded = client.datasets.upload_file(csv_path)
            adaption_ds_id = uploaded.dataset_id

            logger.info(f"Waiting for Adaption dataset {adaption_ds_id} ingestion...")
            import asyncio
            for _ in range(30):
                st = client.datasets.get_status(adaption_ds_id)
                if getattr(st, "row_count", None) is not None:
                    break
                if getattr(st, "status", None) == "failed":
                    break
                await asyncio.sleep(2)

            logger.info(f"Starting actual adaptation run on Adaption dataset {adaption_ds_id}...")
            run = client.datasets.adapt(
                adaption_ds_id,
                column_mapping=mapping,
                job_specification=spec,
                estimate=False,
            )

            run_id = getattr(run, "run_id", f"run-{uuid.uuid4().hex[:8]}")

            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                adaption_dataset_id=adaption_ds_id,
                adaption_run_id=run_id,
                operation_type="adapt",
                status="running",
                column_mapping=mapping,
                job_specification=spec,
                result_metadata={"run_response": str(run)},
            )
            db.add(job)
            await db.commit()
            await db.refresh(job)
            return job
        except Exception as e:
            logger.error(f"Failed to start Adaption run: {e}")
            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                operation_type="adapt",
                status="failed",
                column_mapping=mapping,
                job_specification=spec,
                error_message=str(e),
                completed_at=datetime.now(timezone.utc),
            )
            db.add(job)
            await db.commit()
            await db.refresh(job)
            return job

    @staticmethod
    async def get_job_status(
        job_id: str,
        workspace_id: str,
        db: AsyncSession,
    ) -> Optional[AdaptionJob]:
        stmt = select(AdaptionJob).where(
            AdaptionJob.id == job_id,
            AdaptionJob.workspace_id == workspace_id,
        )
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            return None

        # If job is running and has external dataset id, poll external status
        client = AdaptionService.get_client()
        if client and job.status == "running" and job.adaption_dataset_id:
            try:
                ext_status = client.datasets.get_status(job.adaption_dataset_id)
                ext_st = getattr(ext_status, "status", None)
                if ext_st in ["succeeded", "failed"]:
                    job.status = ext_st
                    job.completed_at = datetime.now(timezone.utc)
                    job.result_metadata = {
                        **job.result_metadata,
                        "final_status": str(ext_status),
                    }
                    await db.commit()
            except Exception as e:
                logger.warning(f"Could not refresh Adaption job status from API: {e}")

        return job
