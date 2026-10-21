from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.database import get_db
from app.services.mcp_service import handle_mcp_request, SERVER_INFO, MCP_RESOURCES, MCP_PROMPTS
from app.services.ai_tools import TOOL_REGISTRY_METADATA

router = APIRouter(prefix="/api/mcp", tags=["Model Context Protocol (MCP) Server for Alexa+"])

@router.post("")
@router.post("/")
async def mcp_jsonrpc_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Official JSON-RPC 2.0 Model Context Protocol (MCP) Server Endpoint for Alexa+ Agents.
    Supports methods:
    - initialize
    - tools/list
    - tools/call
    - resources/list
    - resources/read
    - prompts/list
    - prompts/get
    """
    body = await request.json()
    return await handle_mcp_request(
        request_data=body,
        db=db,
        user_id=1,
        user_email="admin@nexaerp.internal"
    )

@router.get("/manifest")
async def get_mcp_server_manifest() -> Dict[str, Any]:
    """Returns the MCP server manifest, protocol version, and server info."""
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
async def get_mcp_tools() -> Dict[str, Any]:
    """Returns the list of available MCP tools for inspection in custom front-ends."""
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
async def get_mcp_resources() -> Dict[str, Any]:
    """Returns available ERP resource URIs accessible to Alexa+."""
    return {"resources": MCP_RESOURCES}
