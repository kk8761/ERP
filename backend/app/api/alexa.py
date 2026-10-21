from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from app.database import get_db
from app.config import settings
from app.models.auth import User
from app.auth.dependencies import get_current_user
from app.auth.security import decode_token
from app.services.alexa_service import handle_alexa_request

router = APIRouter(prefix="/api/alexa", tags=["Alexa+ & Fire TV Multimodal Skill Gateway"])

@router.post("/skill")
async def alexa_skill_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Standard Amazon Alexa Skill Webhook:
    Receives LaunchRequest, IntentRequest, and SessionEndedRequest from Alexa+,
    Echo Show, and Fire TV, responding with SSML audio and Alexa Presentation Language (APL).
    Derives user identity from Alexa Account Linking accessToken or skill identity;
    never assigns elevated administrator privileges to anonymous voice requests.
    """
    payload = await request.json()

    # 1. Resolve identity from Alexa Account Linking token if present
    user_id: Optional[int] = None
    user_email: str = "voice-assistant@nexaerp.internal"

    access_token = (
        payload.get("session", {}).get("user", {}).get("accessToken") or
        payload.get("context", {}).get("System", {}).get("user", {}).get("accessToken")
    )
    if access_token:
        try:
            token_claims = decode_token(access_token)
            if token_claims and token_claims.get("sub"):
                user_id = int(token_claims["sub"])
                user_email = token_claims.get("email", user_email)
        except Exception:
            pass

    response = await handle_alexa_request(
        request_data=payload,
        db=db,
        user_id=user_id or 0,
        user_email=user_email
    )
    return response

@router.post("/simulate")
async def simulate_alexa_voice_command(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Simulates an Alexa+ voice command directly from the web browser or Fire TV UI.
    Takes a query or intent name and executes using the authenticated caller's identity and permissions.
    """
    body = await request.json()
    query = body.get("query", "Find low-stock products")
    intent_override = body.get("intent")

    if intent_override:
        req_payload = {
            "version": "1.0",
            "request": {
                "type": "IntentRequest",
                "intent": {"name": intent_override, "slots": body.get("slots", {})}
            }
        }
    else:
        req_payload = {
            "version": "1.0",
            "request": {
                "type": "IntentRequest",
                "intent": {
                    "name": "ERPNaturalLanguageIntent",
                    "slots": {"FreeText": {"value": query}}
                },
                "query": query
            }
        }

    return await handle_alexa_request(
        req_payload,
        db=db,
        user_id=current_user.id,
        user_email=current_user.email
    )

@router.get("/sample-intents")
async def get_sample_voice_commands() -> Dict[str, Any]:
    """Returns sample voice commands for developer challenge evaluation."""
    return {
        "device_targets": ["Fire TV Stick 4K Max", "Echo Show 10/15", "Alexa+ Mobile Agent"],
        "voice_commands": [
            {
                "phrase": "Alexa, ask Nexa ERP for low stock alerts",
                "intent": "LowStockIntent",
                "multimodal_view": "Red alert cards with current stock, reorder levels, and 1-touch replenish"
            },
            {
                "phrase": "Alexa, ask Nexa ERP to compare suppliers for Basmati Rice",
                "intent": "VendorCompareIntent",
                "multimodal_view": "Horizontal comparison carousel showing landed costs, lead times, and utility rank"
            },
            {
                "phrase": "Alexa, ask Nexa ERP for the vendor scorecard for Adani Wilmar",
                "intent": "VendorScorecardIntent",
                "multimodal_view": "Dimension radar breakdown, star rating, on-time delivery %, and compliance status"
            },
            {
                "phrase": "Alexa, ask Nexa ERP for today's sales summary",
                "intent": "SalesSummaryIntent",
                "multimodal_view": "Real-time revenue counter, order count, and top 5 revenue-generating products"
            },
            {
                "phrase": "Alexa, approve purchase order number 1",
                "intent": "ApprovePOIntent",
                "multimodal_view": "Biometric voice confirmation with SNS alert and PO dispatch confirmation"
            }
        ]
    }
