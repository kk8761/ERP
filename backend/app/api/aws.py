import re
from fastapi import APIRouter, Depends, Query, status, HTTPException
from typing import Dict, Any, Optional

from app.services.aws_service import (
    get_aws_status,
    emit_aws_cloudwatch_metric,
    publish_aws_sns_alert,
    generate_s3_presigned_url,
    get_recent_cloudwatch_events,
    get_recent_sns_notifications
)
from app.auth.dependencies import get_current_user
from app.models.auth import User

router = APIRouter(prefix="/api/aws", tags=["AWS Cloud Architecture & Telemetry"])

ALLOWED_S3_PREFIXES = ("receipts/", "invoices/", "attachments/", "reports/", "exports/", "avatars/", "signatures/")
ALLOWED_S3_OPERATIONS = {"get_object", "put_object"}

@router.get("/status")
async def get_aws_cloud_status(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns operational health status of AWS services.
    Requires authenticated enterprise user.
    """
    return get_aws_status()

@router.get("/telemetry")
async def get_aws_telemetry(
    limit: int = 25,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Returns recent CloudWatch metrics and SNS notification alerts for authorized operators."""
    limit = max(1, min(limit, 100))
    return {
        "cloudwatch_events": get_recent_cloudwatch_events(limit),
        "sns_alerts": get_recent_sns_notifications(limit)
    }

@router.post("/test-alert")
async def trigger_test_aws_alert(
    subject: str = Query("NexaERP Autonomous Stockout Alert", description="Alert subject"),
    message: str = Query("Stockout deficit detected for 3 SKUs. Approval requested.", description="Alert message"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Publishes a test event to SNS and logs a CloudWatch metric. Requires authenticated staff."""
    if not (current_user.is_superuser or any(r.role and r.role.name in ["System Administrator", "Executive", "Branch Manager"] for r in current_user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and executives can emit broadcast cloud alerts."
        )

    sns_event = publish_aws_sns_alert(subject=subject, message=message)
    cw_event = emit_aws_cloudwatch_metric(
        metric_name="ManualAlertEmitted",
        value=1.0,
        dimensions={"Trigger": "AdminTest", "Emitter": current_user.email}
    )
    return {
        "status": "SUCCESS",
        "sns_event": sns_event,
        "cloudwatch_event": cw_event
    }

@router.get("/s3/presigned-url")
async def get_s3_upload_presigned_url(
    key: str = Query("receipts/receipt-001.pdf", description="Object key in S3"),
    operation: str = Query("put_object", description="get_object or put_object"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generates an Amazon S3 presigned URL for secure document upload or retrieval.
    Enforces route-level authentication, operation allowlisting, and key prefix restrictions (SEC-04).
    """
    # 1. Allowlist operations
    clean_op = operation.strip().lower()
    if clean_op not in ALLOWED_S3_OPERATIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid S3 operation '{operation}'. Permitted operations: {list(ALLOWED_S3_OPERATIONS)}"
        )

    # 2. Restrict key and prevent directory traversal
    clean_key = key.strip().lstrip("/")
    if ".." in clean_key or clean_key.startswith(("/", "\\")) or "\\" in clean_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malicious or invalid S3 object key detected: path traversal is prohibited."
        )

    if not clean_key.startswith(ALLOWED_S3_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"S3 access denied. Object key must begin with one of: {list(ALLOWED_S3_PREFIXES)}"
        )

    return generate_s3_presigned_url(object_key=clean_key, operation=clean_op)
