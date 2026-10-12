import os
import uuid
import csv
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.adaption import AdaptionJob
from app.models.feedback import Feedback
from app.core.config import settings
from app.core.logging import logger
from app.services.adaption_quota_service import AdaptionQuotaService

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
        if not settings.ADAPTION_API_KEY or len(settings.ADAPTION_API_KEY) < 10:
            return None
        if not ADAPTION_AVAILABLE:
            return None
        return Adaption(api_key=settings.ADAPTION_API_KEY, timeout=60.0)

    @staticmethod
    async def check_status(db: Optional[AsyncSession] = None) -> Dict[str, Any]:
        key_configured = bool(settings.ADAPTION_API_KEY and len(settings.ADAPTION_API_KEY) > 10)

        quota_info = {}
        if db:
            try:
                quota_info = await AdaptionQuotaService.get_quota_summary(db)
            except Exception as e:
                logger.warning(f"Failed to fetch quota summary for status: {e}")

        if key_configured and settings.ENABLE_PUBLIC_ADAPTION_OPERATIONS:
            message = "Owner-configured demo integration ready for Adaptive Data workflows."
        elif key_configured and not settings.ENABLE_PUBLIC_ADAPTION_OPERATIONS:
            message = "Public demo operations are currently paused by the project owner."
        else:
            message = "Owner has not configured ADAPTION_API_KEY in the backend environment."

        return {
            "configured": key_configured and ADAPTION_AVAILABLE,
            "api_key_set": key_configured,
            "key_prefix": None,  # Non-negotiable security: never reveal key or any substring
            "sdk_version": ADAPTION_SDK_VERSION,
            "public_operations_enabled": settings.ENABLE_PUBLIC_ADAPTION_OPERATIONS,
            "message": message,
            **quota_info,
        }

    @staticmethod
    async def prepare_adaption_csv(
        dataset_id: str,
        workspace_id: str,
        db: AsyncSession,
        max_rows: int = 250,
    ) -> str:
        """
        Prepares a clean CSV expressing the empathetic support-response task:
        - prompt: Task instruction for the model
        - input: Verbatim feedback and category context
        - verbatim_feedback: Original raw review text (preserved for auditability)
        - category: Review classification
        """
        bounded_limit = min(max(1, max_rows), settings.ADAPTION_MAX_ROWS)
        query = select(Feedback).where(
            Feedback.dataset_id == dataset_id,
            Feedback.workspace_id == workspace_id,
        ).limit(bounded_limit)
        res = await db.execute(query)
        feedbacks = res.scalars().all()

        unique_id = uuid.uuid4().hex[:8]
        export_path = os.path.join(settings.DATA_DIR, f"adaption_input_{dataset_id}_{unique_id}.csv")
        with open(export_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["instruction", "input", "verbatim_feedback", "category"])
            for fb in feedbacks:
                writer.writerow([
                    "Write a concise, empathetic customer support resolution addressing this user's feedback.",
                    f"Customer Feedback: {fb.original_text}\nCategory: {fb.source_category or 'General'}",
                    fb.original_text,
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

        mapping = column_mapping or {
            "prompt": "instruction",
            "context": ["input"],
        }
        bounded_rows = min(max(1, max_rows), settings.ADAPTION_MAX_ROWS)
        spec = {"max_rows": bounded_rows}

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
            raise ValueError("ADAPTION_API_KEY is not configured on the backend.")

        csv_path = None
        try:
            # 1. Prepare export file (bounded and task-aligned)
            csv_path = await AdaptionService.prepare_adaption_csv(
                dataset_id=dataset_id,
                workspace_id=workspace_id,
                db=db,
                max_rows=bounded_rows,
            )

            # 2. Upload dataset to Adaption Labs
            logger.info(f"Uploading file {csv_path} to Adaption Labs for cost estimate...")
            uploaded = client.datasets.upload_file(csv_path)
            adaption_ds_id = getattr(uploaded, "dataset_id", None)
            if not adaption_ds_id:
                raise RuntimeError("Adaption upload response did not return a dataset ID.")

            # 3. Wait for ingestion to complete
            logger.info(f"Waiting for Adaption dataset {adaption_ds_id} ingestion...")
            import asyncio
            ingestion_succeeded = False
            for _ in range(15):
                st = client.datasets.get_status(adaption_ds_id)
                st_val = getattr(st, "status", None)
                if st_val == "succeeded" or (st_val not in ["failed", None] and getattr(st, "row_count", None) is not None):
                    ingestion_succeeded = True
                    break
                if st_val == "failed":
                    err_data = getattr(st, "error_data", "Ingestion failed upstream")
                    raise RuntimeError(f"Adaption dataset ingestion failed: {err_data}")
                await asyncio.sleep(2)

            if not ingestion_succeeded:
                raise TimeoutError("Timed out waiting for Adaption dataset ingestion.")

            # 4. Request estimate
            logger.info(f"Requesting adaptation estimate for Adaption dataset {adaption_ds_id}...")
            estimate = client.datasets.adapt(
                adaption_ds_id,
                column_mapping=mapping,
                job_specification=spec,
                estimate=True,
            )

            est_credits = getattr(estimate, "estimated_credits_consumed", None)
            est_minutes = getattr(estimate, "estimated_minutes", None)
            raw_run_id = getattr(estimate, "run_id", None)
            run_id = str(raw_run_id) if isinstance(raw_run_id, str) else None

            raw_cm = getattr(estimate, "credit_multiplier", None)
            credit_mult = float(raw_cm) if isinstance(raw_cm, (int, float)) else None

            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                adaption_dataset_id=str(adaption_ds_id) if isinstance(adaption_ds_id, str) else None,
                adaption_run_id=run_id,
                operation_type="estimate",
                status="succeeded",
                column_mapping=mapping,
                job_specification=spec,
                estimated_credits=float(est_credits) if isinstance(est_credits, (int, float)) else None,
                estimated_minutes=float(est_minutes) if isinstance(est_minutes, (int, float)) else None,
                result_metadata={
                    "estimate": True,
                    "credit_multiplier": credit_mult,
                },
                completed_at=datetime.now(timezone.utc),
            )
            db.add(job)
            await db.commit()

            return {
                "local_job_id": local_job_id,
                "dataset_id": dataset_id,
                "adaption_dataset_id": adaption_ds_id,
                "estimated_credits": float(est_credits) if est_credits is not None else None,
                "estimated_minutes": float(est_minutes) if est_minutes is not None else None,
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
            raise RuntimeError(f"Adaption estimate error: {str(e)}")
        finally:
            if csv_path and os.path.exists(csv_path):
                try:
                    os.remove(csv_path)
                except Exception as ex:
                    logger.warning(f"Could not remove temp CSV {csv_path}: {ex}")

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
        raw_rows = (job_specification or {}).get("max_rows", 250)
        bounded_rows = min(max(1, int(raw_rows)), settings.ADAPTION_MAX_ROWS)
        spec = {"max_rows": bounded_rows}

        if not client:
            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                operation_type="adapt",
                status="failed",
                column_mapping=mapping,
                job_specification=spec,
                error_message="ADAPTION_API_KEY is not configured on the backend.",
            )
            db.add(job)
            await db.commit()
            raise ValueError("ADAPTION_API_KEY is not configured on the backend.")

        csv_path = None
        try:
            csv_path = await AdaptionService.prepare_adaption_csv(
                dataset_id=dataset_id,
                workspace_id=workspace_id,
                db=db,
                max_rows=bounded_rows,
            )
            logger.info(f"Uploading file {csv_path} to Adaption Labs for adaptation run...")
            uploaded = client.datasets.upload_file(csv_path)
            adaption_ds_id = getattr(uploaded, "dataset_id", None)
            if not adaption_ds_id:
                raise RuntimeError("Adaption upload response did not return a dataset ID.")

            logger.info(f"Waiting for Adaption dataset {adaption_ds_id} ingestion...")
            import asyncio
            ingestion_succeeded = False
            for _ in range(15):
                st = client.datasets.get_status(adaption_ds_id)
                st_val = getattr(st, "status", None)
                if st_val == "succeeded" or (st_val not in ["failed", None] and getattr(st, "row_count", None) is not None):
                    ingestion_succeeded = True
                    break
                if st_val == "failed":
                    err_data = getattr(st, "error_data", "Ingestion failed upstream")
                    raise RuntimeError(f"Adaption dataset ingestion failed: {err_data}")
                await asyncio.sleep(2)

            if not ingestion_succeeded:
                raise TimeoutError("Timed out waiting for Adaption dataset ingestion.")

            logger.info(f"Starting adaptation run on Adaption dataset {adaption_ds_id}...")
            run = client.datasets.adapt(
                adaption_ds_id,
                column_mapping=mapping,
                job_specification=spec,
                estimate=False,
            )

            # Never fabricate fallback run ID; store None if provider did not return one
            run_id = getattr(run, "run_id", None)
            est_credits = getattr(run, "estimated_credits_consumed", None)
            est_minutes = getattr(run, "estimated_minutes", None)

            job = AdaptionJob(
                id=local_job_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                adaption_dataset_id=str(adaption_ds_id) if isinstance(adaption_ds_id, str) else None,
                adaption_run_id=str(run_id) if isinstance(run_id, str) else None,
                operation_type="adapt",
                status="running",
                column_mapping=mapping,
                job_specification=spec,
                estimated_credits=float(est_credits) if isinstance(est_credits, (int, float)) else None,
                estimated_minutes=float(est_minutes) if isinstance(est_minutes, (int, float)) else None,
                result_metadata={
                    "credit_multiplier": float(getattr(run, "credit_multiplier", None)) if isinstance(getattr(run, "credit_multiplier", None), (int, float)) else None,
                },
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
                result_metadata={},
                error_message=str(e),
                completed_at=datetime.now(timezone.utc),
            )
            db.add(job)
            await db.commit()
            await db.refresh(job)
            return job
        finally:
            if csv_path and os.path.exists(csv_path):
                try:
                    os.remove(csv_path)
                except Exception as ex:
                    logger.warning(f"Could not remove temp CSV {csv_path}: {ex}")

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

        # If job is running and has external dataset id, poll upstream status
        client = AdaptionService.get_client()
        if client and job.status == "running" and job.adaption_dataset_id:
            try:
                ext_status = client.datasets.get_status(job.adaption_dataset_id)
                ext_st = getattr(ext_status, "status", None)
                meta = dict(job.result_metadata or {})
                if ext_st == "succeeded":
                    job.status = "succeeded"
                    job.completed_at = datetime.now(timezone.utc)
                    job.result_metadata = {
                        **meta,
                        "row_count": getattr(ext_status, "row_count", None),
                        "progress": getattr(ext_status, "progress", None),
                    }
                    await db.commit()
                elif ext_st == "failed":
                    job.status = "failed"
                    job.completed_at = datetime.now(timezone.utc)
                    err_data = getattr(ext_status, "error_data", None)
                    job.error_message = str(err_data) if err_data else "Adaption run failed upstream."
                    job.result_metadata = {
                        **meta,
                        "error_data": str(err_data) if err_data else None,
                    }
                    await db.commit()
                elif ext_st in ["pending", "running", "awaiting_input"]:
                    # Still running; update progress metadata
                    job.result_metadata = {
                        **meta,
                        "upstream_status": ext_st,
                        "progress": getattr(ext_status, "progress", None),
                    }
                    await db.commit()
            except Exception as e:
                logger.warning(f"Could not refresh Adaption job status from API: {e}")

        return job

    @staticmethod
    async def download_adapted_dataset(
        job_id: str,
        workspace_id: str,
        file_format: str,
        db: AsyncSession,
    ) -> Tuple[bytes, str]:
        """
        Downloads the adapted dataset file from Adaption Labs for a completed job.
        Returns (content_bytes, filename).
        """
        stmt = select(AdaptionJob).where(
            AdaptionJob.id == job_id,
            AdaptionJob.workspace_id == workspace_id,
        )
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Adaption job not found.")

        if job.operation_type != "adapt" or job.status != "succeeded" or not job.adaption_dataset_id:
            raise HTTPException(
                status_code=400,
                detail="Output download is only available for successfully completed Adaption jobs.",
            )

        client = AdaptionService.get_client()
        if not client:
            raise HTTPException(
                status_code=503,
                detail="Adaption API client is not configured.",
            )

        valid_format = file_format if file_format in ["csv", "json", "jsonl", "parquet"] else "csv"
        try:
            logger.info(f"Downloading adapted dataset {job.adaption_dataset_id} in {valid_format} format...")
            response = client.datasets.download(dataset_id=job.adaption_dataset_id, file_format=valid_format)
            content = response.read()
            filename = f"insightflow_adapted_{job.id}.{valid_format}"
            return content, filename
        except Exception as e:
            logger.error(f"Failed to download adapted dataset from Adaption API: {e}")
            raise HTTPException(
                status_code=502,
                detail=f"Failed to retrieve output from Adaption Labs: {str(e)}",
            )
