from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.database import get_db
from app.services.alexa_service import handle_alexa_request
from app.auth.dependencies import get_current_user
from app.models.auth import User

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
    """
    payload = await request.json()
    response = await handle_alexa_request(
        request_data=payload,
        db=db,
        user_id=1,
        user_email="admin@nexaerp.internal"
    )
    return response

@router.post("/simulate")
async def simulate_alexa_voice_command(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Simulates an Alexa+ voice command directly from the web browser or Fire TV UI.
    Takes a query or intent name and returns the exact SSML speech, card, and APL document.
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

    return await handle_alexa_request(req_payload, db=db, user_id=1, user_email="admin@nexaerp.internal")

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
