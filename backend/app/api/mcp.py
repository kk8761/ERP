from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional

from app.database import get_db
from app.config import settings
from app.models.auth import User
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.services.mcp_service import handle_mcp_request, SERVER_INFO, MCP_RESOURCES, MCP_PROMPTS
from app.services.ai_tools import TOOL_REGISTRY_METADATA

router = APIRouter(prefix="/api/mcp", tags=["Model Context Protocol (MCP) Server for Alexa+"])

@router.post("")
@router.post("/")
async def mcp_jsonrpc_endpoint(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Official JSON-RPC 2.0 Model Context Protocol (MCP) Server Endpoint for Alexa+ Agents.
    Enforces authentication for tools/call, resources/read, and prompts/get.
    Derives identity from verified credentials; NEVER assigns administrator identity to anonymous callers.
    """
    body = await request.json()
    method = body.get("method", "")
    req_id = body.get("id", 1)

    # SEC-20: Separate dedicated MCP service credential. Never fallback to SECRET_KEY.
    api_key = request.headers.get("x-api-key")
    configured_mcp_key = getattr(settings, "MCP_API_KEY", None)

    user_id: Optional[int] = None
    user_email: Optional[str] = None

    if current_user:
        user_id = current_user.id
        user_email = current_user.email
    elif api_key and configured_mcp_key and api_key == configured_mcp_key:
        # SEC-20: Map verified service key to dedicated least-privilege service account, NOT admin
        user_id = 9999
        user_email = "mcp-service-agent@nexaerp.internal"

    # Sensitive / state-changing MCP methods REQUIRE authenticated caller
    if method in ["tools/call", "resources/read", "prompts/get"] and not user_id:
        return {
            "jsonrpc": body.get("jsonrpc", "2.0"),
            "id": req_id,
            "error": {
                "code": -32001,
                "message": f"Unauthorized: MCP method '{method}' requires authenticated session (Bearer token) or valid X-API-Key."
            }
        }

    return await handle_mcp_request(
        request_data=body,
        db=db,
        user_id=user_id or 0,
        user_email=user_email or "anonymous@nexaerp.internal"
    )

@router.get("/manifest")
async def get_mcp_server_manifest() -> Dict[str, Any]:
    """Returns the MCP server manifest, protocol version, and server info for protocol negotiation."""
    return {
        "serverInfo": SERVER_INFO,
        "protocolVersion": "2024-11-05",
        "transport": "HTTP / JSON-RPC 2.0",
        "endpoints": {
            "jsonrpc": "/api/mcp",
            "tools": "/api/mcp/tools",
            "resources": "/api/mcp/resources"
        },
        "capabilities": {
            "tools": len(TOOL_REGISTRY_METADATA),
            "resources": len(MCP_RESOURCES),
            "prompts": len(MCP_PROMPTS)
        }
    }

@router.get("/tools")
async def get_mcp_tools(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns the list of available MCP tools for authenticated users and agents."""
    return {
        "tools": [
            {
                "name": t["name"],
                "description": t["description"],
                "inputSchema": t["parameters"]
            }
            for t in TOOL_REGISTRY_METADATA
        ]
    }

@router.get("/resources")
async def get_mcp_resources(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns available ERP resource URIs accessible to authenticated users and agents."""
    return {"resources": MCP_RESOURCES}
