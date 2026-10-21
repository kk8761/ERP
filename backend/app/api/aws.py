from fastapi import APIRouter, Depends, Query, status
from typing import Dict, Any, Optional

from app.services.aws_service import (
    get_aws_status,
    emit_aws_cloudwatch_metric,
    publish_aws_sns_alert,
    generate_s3_presigned_url,
    get_recent_cloudwatch_events,
    get_recent_sns_notifications
)
from app.auth.dependencies import require_permission

router = APIRouter(prefix="/api/aws", tags=["AWS Cloud Architecture & Telemetry"])

@router.get("/status")
async def get_aws_cloud_status() -> Dict[str, Any]:
    """
    Returns operational health status of AWS services:
    - Amazon Bedrock (Claude 3.5 Sonnet / Titan / Nova)
    - Amazon S3 Document Store
    - Amazon SNS Notification Gateway
    - AWS CloudWatch Telemetry
    - Alexa+ & Fire TV Multimodal Skill
    """
    return get_aws_status()

@router.get("/telemetry")
async def get_aws_telemetry(limit: int = 25) -> Dict[str, Any]:
    """Returns recent CloudWatch metrics and SNS notification alerts."""
    return {
        "cloudwatch_events": get_recent_cloudwatch_events(limit),
        "sns_alerts": get_recent_sns_notifications(limit)
    }

@router.post("/test-alert")
async def trigger_test_aws_alert(
    subject: str = Query("NexaERP Autonomous Stockout Alert", description="Alert subject"),
    message: str = Query("Stockout deficit detected for 3 SKUs. Approval requested.", description="Alert message")
) -> Dict[str, Any]:
    """Publishes a test event to SNS and logs a CloudWatch metric."""
    sns_event = publish_aws_sns_alert(subject=subject, message=message)
    cw_event = emit_aws_cloudwatch_metric(
        metric_name="ManualAlertEmitted",
        value=1.0,
        dimensions={"Trigger": "AdminTest"}
    )
    return {
        "status": "SUCCESS",
        "sns_event": sns_event,
        "cloudwatch_event": cw_event
    }

@router.get("/s3/presigned-url")
async def get_s3_upload_presigned_url(
    key: str = Query("receipts/receipt-001.pdf", description="Object key in S3"),
    operation: str = Query("put_object", description="get_object or put_object")
) -> Dict[str, Any]:
    """Generates an Amazon S3 presigned URL for secure document upload or retrieval."""
    return generate_s3_presigned_url(object_key=key, operation=operation)
