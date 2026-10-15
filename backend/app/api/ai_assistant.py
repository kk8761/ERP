from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.services.ai_service import process_ai_query
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/ai", tags=["Nexa AI Assistant"])

class AIQueryRequest(BaseModel):
    prompt: str = Field(..., min_length=2)

@router.post("/query")
async def query_ai(
    req: AIQueryRequest,
    current_user: User = Depends(require_permission("ai.use")),
    db: AsyncSession = Depends(get_db)
):
    result = await process_ai_query(
        db=db,
        prompt=req.prompt,
        user_name=current_user.full_name
    )
    await record_audit_log(
        db, action="AI_QUERY", entity_name="AIAssistant",
        user_id=current_user.id, user_email=current_user.email,
        details={"prompt": req.prompt}
    )
    await db.commit()
    return result
