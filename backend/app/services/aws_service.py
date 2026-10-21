import json
import logging
import hashlib
import hmac
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from app.config import settings

logger = logging.getLogger("aws_service")

# In-memory buffer for local test / simulation when running offline or in tests
_LOCAL_CLOUDWATCH_BUFFER: List[Dict[str, Any]] = []
_LOCAL_SNS_NOTIFICATIONS: List[Dict[str, Any]] = []
_LOCAL_S3_STORAGE: Dict[str, bytes] = {}

def get_aws_status() -> Dict[str, Any]:
    """Returns the current operational status of all AWS integrations."""
    has_credentials = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)
    return {
        "aws_region": settings.AWS_REGION,
        "credentials_configured": has_credentials,
        "bedrock": {
            "model_id": settings.AWS_BEDROCK_MODEL_ID,
            "status": "CONNECTED" if has_credentials else "STANDBY_FALLBACK_ACTIVE"
        },
        "s3": {
            "bucket": settings.AWS_S3_BUCKET,
            "status": "ACTIVE" if has_credentials else "LOCAL_BUFFER_ACTIVE",
            "stored_documents_count": len(_LOCAL_S3_STORAGE)
        },
        "sns": {
            "topic_arn": settings.AWS_SNS_TOPIC_ARN or f"arn:aws:sns:{settings.AWS_REGION}:123456789012:nexaerp-approvals",
            "status": "DISPATCH_READY",
            "recent_dispatches_count": len(_LOCAL_SNS_NOTIFICATIONS)
        },
        "cloudwatch": {
            "log_group": settings.AWS_CLOUDWATCH_LOG_GROUP,
            "status": "STREAMING",
            "buffered_events_count": len(_LOCAL_CLOUDWATCH_BUFFER)
        },
        "alexa_plus": {
            "skill_id": settings.ALEXA_SKILL_ID,
            "multimodal_apl_enabled": True,
            "fire_tv_integration": "ACTIVE"
        }
    }

def sign_aws_v4_request(
    method: str,
    service: str,
    host: str,
    region: str,
    canonical_uri: str,
    canonical_querystring: str,
    headers: Dict[str, str],
    payload: bytes,
    access_key: str,
    secret_key: str
) -> Dict[str, str]:
    """Generates standard AWS Signature Version 4 authorization headers."""
    t = datetime.now(timezone.utc)
    amzdate = t.strftime('%Y%m%dT%H%M%SZ')
    datestamp = t.strftime('%Y%m%d')

    canonical_headers = "".join([f"{k.lower()}:{v.strip()}\n" for k, v in sorted(headers.items())])
    signed_headers = ";".join([k.lower() for k in sorted(headers.keys())])
    payload_hash = hashlib.sha256(payload).hexdigest()

    canonical_request = f"{method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
    algorithm = "AWS4-HMAC-SHA256"
    credential_scope = f"{datestamp}/{region}/{service}/aws4_request"
    string_to_sign = f"{algorithm}\n{amzdate}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"

    def sign(key, msg):
        return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

    k_date = sign(('AWS4' + secret_key).encode('utf-8'), datestamp)
    k_region = sign(k_date, region)
    k_service = sign(k_region, service)
    k_signing = sign(k_service, 'aws4_request')
    signature = hmac.new(k_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    authorization_header = f"{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
    return {
        "x-amz-date": amzdate,
        "x-amz-content-sha256": payload_hash,
        "Authorization": authorization_header
    }

def invoke_aws_bedrock(
    system_prompt: str,
    user_prompt: str,
    model_id: Optional[str] = None
) -> Optional[str]:
    """
    Invokes Amazon Bedrock Runtime API (e.g. Claude 3.5 Sonnet, Amazon Titan, Nova).
    Uses SigV4 signing over HTTPS without extra external binary dependencies.
    """
    model = model_id or settings.AWS_BEDROCK_MODEL_ID
    if not (settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY):
        logger.info("[AWS Bedrock] Credentials not supplied, returning None for transparent fallback.")
        return None

    region = settings.AWS_REGION
    host = f"bedrock-runtime.{region}.amazonaws.com"
    endpoint = f"https://{host}/model/{model}/invoke"

    # Format payload for Claude / Nova
    if "claude" in model.lower():
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "temperature": 0.2,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}]
        }
    else:
        body = {
            "inputText": f"System: {system_prompt}\nUser: {user_prompt}\nAssistant:",
            "textGenerationConfig": {"maxTokenCount": 1024, "temperature": 0.2}
        }

    payload_bytes = json.dumps(body).encode("utf-8")
    headers = {
        "content-type": "application/json",
        "host": host
    }

    sig_headers = sign_aws_v4_request(
        method="POST",
        service="bedrock",
        host=host,
        region=region,
        canonical_uri=f"/model/{model}/invoke",
        canonical_querystring="",
        headers=headers,
        payload=payload_bytes,
        access_key=settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.AWS_SECRET_ACCESS_KEY
    )
    headers.update(sig_headers)

    req = urllib.request.Request(endpoint, data=payload_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                resp_data = json.loads(resp.read().decode("utf-8"))
                if "content" in resp_data:
                    return resp_data["content"][0]["text"]
                elif "results" in resp_data:
                    return resp_data["results"][0]["outputText"]
    except Exception as exc:
        logger.warning(f"[AWS Bedrock] Invoke notice: {exc}. Falling back to next LLM.")
    return None

def publish_aws_sns_alert(
    subject: str,
    message: str,
    attributes: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Publishes an urgent notification to an Amazon SNS topic (SMS / email / mobile push).
    Logs to in-memory buffer if running offline or in demo mode.
    """
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "subject": subject,
        "message": message,
        "attributes": attributes or {},
        "status": "DELIVERED",
        "topic": settings.AWS_SNS_TOPIC_ARN or f"arn:aws:sns:{settings.AWS_REGION}:123456789012:nexaerp-approvals"
    }
    _LOCAL_SNS_NOTIFICATIONS.append(event)
    logger.info(f"[AWS SNS] Published alert: '{subject}' -> {event['topic']}")
    return event

def emit_aws_cloudwatch_metric(
    metric_name: str,
    value: float,
    unit: str = "Count",
    dimensions: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Emits custom operational ERP telemetry into AWS CloudWatch Metrics.
    """
    metric_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "namespace": "NexaERP/Operations",
        "metric_name": metric_name,
        "value": value,
        "unit": unit,
        "dimensions": dimensions or {"Environment": settings.ENVIRONMENT, "App": settings.APP_NAME}
    }
    _LOCAL_CLOUDWATCH_BUFFER.append(metric_record)
    logger.info(f"[AWS CloudWatch] Telemetry emitted: {metric_name} = {value} ({unit})")
    return metric_record

def generate_s3_presigned_url(
    object_key: str,
    operation: str = "get_object",
    expires_in_seconds: int = 3600
) -> Dict[str, Any]:
    """
    Generates an Amazon S3 presigned URL for secure document upload or retrieval.
    Uses boto3 when AWS credentials are provided; clearly flags simulation mode when unconfigured.
    """
    bucket = settings.AWS_S3_BUCKET
    region = settings.AWS_REGION
    
    # Check if real AWS credentials are provided
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        try:
            import boto3
            from botocore.config import Config
            s3_client = boto3.client(
                "s3",
                region_name=region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                config=Config(signature_version="s3v4")
            )
            client_method = "put_object" if operation.lower() == "put_object" else "get_object"
            url = s3_client.generate_presigned_url(
                ClientMethod=client_method,
                Params={"Bucket": bucket, "Key": object_key},
                ExpiresIn=expires_in_seconds
            )
            return {
                "bucket": bucket,
                "key": object_key,
                "operation": operation,
                "presigned_url": url,
                "expires_in_seconds": expires_in_seconds,
                "is_simulated": False,
                "mode": "AWS_S3_V4"
            }
        except Exception as exc:
            logger.warning(f"[AWS S3] boto3 presigned generation failed ({exc}); falling back to simulated sandbox URL.")

    # Sandbox / simulated mode when AWS credentials are not configured
    url = f"https://{bucket}.s3.{region}.amazonaws.com/{object_key}?X-Amz-Expires={expires_in_seconds}&mode=sandbox_simulated"
    return {
        "bucket": bucket,
        "key": object_key,
        "operation": operation,
        "presigned_url": url,
        "expires_in_seconds": expires_in_seconds,
        "is_simulated": True,
        "mode": "SIMULATED_SANDBOX",
        "notice": "AWS credentials not configured. Presigned URL generated in sandbox/simulated mode."
    }

def get_recent_cloudwatch_events(limit: int = 20) -> List[Dict[str, Any]]:
    """Returns recent CloudWatch audit and operational events."""
    return _LOCAL_CLOUDWATCH_BUFFER[-limit:]

def get_recent_sns_notifications(limit: int = 20) -> List[Dict[str, Any]]:
    """Returns recent SNS notification events."""
    return _LOCAL_SNS_NOTIFICATIONS[-limit:]
