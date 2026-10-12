import csv
import io
import os
import uuid
from typing import Dict, Any, List, Tuple
from collections import Counter
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.core.config import settings
from app.core.logging import logger


class CSVImportService:
    CHUNK_SIZE = 500  # bounded batch insert size

    @staticmethod
    async def process_csv_file(
        file: UploadFile,
        dataset_name: str,
        workspace_id: str,
        db: AsyncSession,
    ) -> Tuple[Dataset, Dict[str, Any]]:
        # Validate filename and extension
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Uploaded file must be a .csv file.",
            )

        # Read content safely with bounded size check
        content = await file.read()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
            )

        # Handle encoding
        try:
            decoded = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                decoded = content.decode("latin-1")
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unable to decode CSV file: {str(e)}",
                )

        reader = csv.reader(io.StringIO(decoded))
        try:
            header = next(reader)
        except StopIteration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded CSV file is completely empty.",
            )

        # Normalize header
        clean_header = [h.strip().lower() for h in header]
        review_col_idx = -1
        category_col_idx = -1

        for idx, col in enumerate(clean_header):
            if col in ["review", "feedback", "text", "comment", "customer_feedback"]:
                review_col_idx = idx
            elif col in ["category", "source_category", "type", "tag"]:
                category_col_idx = idx

        # Fallback to column 0 if review column not found by name
        if review_col_idx == -1 and len(clean_header) >= 1:
            review_col_idx = 0
        if category_col_idx == -1 and len(clean_header) >= 2:
            category_col_idx = 1

        total_rows = 0
        valid_rows = 0
        invalid_rows = 0
        text_counter = Counter()
        category_counter = Counter()
        sample_rows: List[Dict[str, Any]] = []

        raw_feedback_records: List[Dict[str, Any]] = []

        for row_num, row in enumerate(reader, start=2):
            total_rows += 1
            if not row or all(c.strip() == "" for c in row):
                invalid_rows += 1
                continue

            review_text = row[review_col_idx].strip() if review_col_idx < len(row) else ""
            category_text = row[category_col_idx].strip() if (category_col_idx != -1 and category_col_idx < len(row)) else "Uncategorized"

            if total_rows > settings.MAX_CSV_ROWS:
                raise HTTPException(
                    status_code=422,
                    detail=f"CSV contains {total_rows} rows, exceeding the public demo limit of {settings.MAX_CSV_ROWS} rows.",
                )

            if not review_text:
                invalid_rows += 1
                continue

            valid_rows += 1
            text_counter[review_text] += 1
            category_counter[category_text] += 1

            raw_feedback_records.append({
                "original_text": review_text,
                "source_category": category_text,
            })

            if len(sample_rows) < 5:
                sample_rows.append({
                    "row_index": total_rows,
                    "review": review_text[:120] + ("..." if len(review_text) > 120 else ""),
                    "category": category_text,
                })

        unique_exact_statements = len(text_counter)
        repeated_rows = valid_rows - unique_exact_statements

        # Save local copy for exports
        dataset_id = f"ds-{uuid.uuid4().hex[:12]}"
        save_path = os.path.join(settings.DATA_DIR, f"{dataset_id}.csv")
        try:
            with open(save_path, "wb") as f:
                f.write(content)
        except Exception as e:
            logger.warning(f"Failed to cache uploaded CSV to disk: {e}")

        try:
            # Create Dataset entity
            dataset = Dataset(
                id=dataset_id,
                workspace_id=workspace_id,
                name=dataset_name or file.filename or "Uploaded Dataset",
                original_filename=file.filename or "dataset.csv",
                row_count=total_rows,
                valid_rows=valid_rows,
                invalid_rows=invalid_rows,
                unique_feedback_count=unique_exact_statements,
                repeat_feedback_count=repeated_rows,
                category_distribution=dict(category_counter),
                has_timestamps=False,  # Honest assessment: standard dataset has no timestamp column
                status="imported",
            )
            db.add(dataset)
            await db.flush()

            # Batch insert Feedbacks
            for i in range(0, len(raw_feedback_records), CSVImportService.CHUNK_SIZE):
                chunk = raw_feedback_records[i : i + CSVImportService.CHUNK_SIZE]
                feedbacks = [
                    Feedback(
                        id=f"fb-{uuid.uuid4().hex[:12]}",
                        workspace_id=workspace_id,
                        dataset_id=dataset.id,
                        original_text=item["original_text"],
                        source_category=item["source_category"],
                        sentiment_label=None,  # STRICT: Kept nullable until AI analysis runs!
                        sentiment_score=None,
                        confidence_score=None,
                        analysis_status="pending",
                    )
                    for item in chunk
                ]
                db.add_all(feedbacks)
                await db.flush()

            await db.commit()
            await db.refresh(dataset)
        except Exception as err:
            await db.rollback()
            if os.path.exists(save_path):
                try:
                    os.remove(save_path)
                except Exception:
                    pass
            logger.error(f"Transaction aborted during CSV import: {err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to ingest dataset due to an internal transaction error. Partial writes were rolled back.",
            )

        summary = {
            "dataset_id": dataset.id,
            "workspace_id": workspace_id,
            "name": dataset.name,
            "original_filename": dataset.original_filename,
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "invalid_rows": invalid_rows,
            "unique_exact_statements": unique_exact_statements,
            "repeated_rows": repeated_rows,
            "categories": dict(category_counter),
            "has_timestamps": False,
            "timestamp_notes": "Temporal timestamps are absent in source CSV. Temporal analytics disabled honestly.",
            "sample_rows": sample_rows,
        }

        return dataset, summary
