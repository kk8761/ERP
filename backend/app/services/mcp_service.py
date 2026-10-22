import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai_tools import TOOL_REGISTRY_METADATA, execute_typed_tool
from app.services.aws_service import emit_aws_cloudwatch_metric

logger = logging.getLogger("mcp_service")

MCP_PROTOCOL_VERSION = "2024-11-05"
SERVER_INFO = {
    "name": "nexaerp-alexa-mcp-server",
    "title": "NexaERP Model Context Protocol Server for Alexa+",
    "version": "1.0.0",
    "description": "Self-hosted MCP server exposing enterprise ERP tools, live resources, and prompt templates to Alexa+ agents."
}

# MCP Resource Registry
MCP_RESOURCES = [
    {
        "uri": "erp://inventory/low-stock",
        "name": "Low Stock Inventory Alerts",
        "description": "Real-time list of inventory products currently below safety reorder levels.",
        "mimeType": "application/json"
    },
    {
        "uri": "erp://procurement/vendor-scorecards",
        "name": "Supplier Performance Scorecards",
        "description": "Historical 10-dimension vendor performance ratings, star ratings, and statutory eligibility.",
        "mimeType": "application/json"
    },
    {
        "uri": "erp://workflows/active",
        "name": "Active Background Workflows",
        "description": "Persistent scheduled and event-driven automation workflows currently active on server.",
        "mimeType": "application/json"
    },
    {
        "uri": "erp://finance/daily-summary",
        "name": "Today's Sales & Operations Summary",
        "description": "Live POS and sales ledger metrics, revenue totals, and top-selling products.",
        "mimeType": "application/json"
    }
]

# MCP Prompt Templates
MCP_PROMPTS = [
    {
        "name": "procurement_replenishment_plan",
        "description": "Audit depleted stockouts, compare supplier quotes, and stage draft purchase orders with approval gating.",
        "arguments": [
            {"name": "urgency", "description": "ALL or CRITICAL", "required": False}
        ]
    },
    {
        "name": "vendor_performance_audit",
        "description": "Evaluate historical order delivery timeliness, invoice accuracy, and quality inspection yields across vendors.",
        "arguments": [
            {"name": "supplier_name", "description": "Target vendor name", "required": True}
        ]
    },
    {
        "name": "conditional_governance_workflow",
        "description": "Create threshold-based approval routing rules to enforce segregation of duties.",
        "arguments": [
            {"name": "threshold_amount", "description": "Order amount threshold", "required": True},
            {"name": "assigned_role", "description": "Reviewer role", "required": True}
        ]
    }
]

async def handle_mcp_request(
    request_data: Dict[str, Any],
    db: AsyncSession,
    user_id: int = 1,
    user_email: str = "admin@nexaerp.internal",
    organization_id: int = 1,
    branch_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Handles JSON-RPC 2.0 requests conforming to the open Model Context Protocol (MCP)
    specification used by Alexa+ agents and custom web simulators.
    """
    jsonrpc = request_data.get("jsonrpc", "2.0")
    req_id = request_data.get("id", 1)
    method = request_data.get("method", "")
    params = request_data.get("params", {})

    emit_aws_cloudwatch_metric(
        metric_name="MCPRequestsCount",
        value=1.0,
        dimensions={"Method": method, "Client": "Alexa+Agent"}
    )

    # 1. Initialize
    if method == "initialize":
        return {
            "jsonrpc": jsonrpc,
            "id": req_id,
            "result": {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "serverInfo": SERVER_INFO,
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False, "listChanged": False},
                    "prompts": {"listChanged": False}
                }
            }
        }

    # 2. Tools List
    elif method == "tools/list":
        mcp_tools = []
        for t in TOOL_REGISTRY_METADATA:
            mcp_tools.append({
                "name": t["name"],
                "description": t["description"],
                "inputSchema": t["parameters"]
            })
        return {
            "jsonrpc": jsonrpc,
            "id": req_id,
            "result": {"tools": mcp_tools}
        }

    # 3. Tools Call
    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        try:
            tool_output = await execute_typed_tool(
                tool_name=tool_name,
                parameters=arguments,
                db=db,
                user_id=user_id,
                user_email=user_email,
                organization_id=organization_id,
                branch_id=branch_id
            )
            return {
                "jsonrpc": jsonrpc,
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(tool_output, indent=2, default=str)
                        }
                    ],
                    "isError": False
                }
            }
        except Exception as exc:
            logger.error(f"[MCP] Tool '{tool_name}' execution error: {exc}")
            return {
                "jsonrpc": jsonrpc,
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error: {str(exc)}"}],
                    "isError": True
                }
            }

    # 4. Resources List
    elif method == "resources/list":
        return {
            "jsonrpc": jsonrpc,
            "id": req_id,
            "result": {"resources": MCP_RESOURCES}
        }

    # 5. Resources Read
    elif method == "resources/read":
        uri = params.get("uri", "")
        if uri == "erp://inventory/low-stock":
            res = await execute_typed_tool("search_inventory", {"low_stock_only": True}, db, user_id=user_id, user_email=user_email)
            content_text = json.dumps(res, indent=2, default=str)
        elif uri == "erp://finance/daily-summary":
            res = await execute_typed_tool("summarize_sales", {"period": "today"}, db, user_id=user_id, user_email=user_email)
            content_text = json.dumps(res, indent=2, default=str)
        elif uri == "erp://procurement/vendor-scorecards":
            res = await execute_typed_tool("get_vendor_scorecard", {"supplier_name_or_id": "Adani Wilmar"}, db, user_id=user_id, user_email=user_email)
            content_text = json.dumps(res, indent=2, default=str)
        elif uri == "erp://workflows/active":
            res = await execute_typed_tool("list_scheduled_workflows", {}, db, user_id=user_id, user_email=user_email)
            content_text = json.dumps(res, indent=2, default=str)
        else:
            return {
                "jsonrpc": jsonrpc,
                "id": req_id,
                "error": {"code": -32602, "message": f"Resource URI '{uri}' not found."}
            }

        return {
            "jsonrpc": jsonrpc,
            "id": req_id,
            "result": {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "application/json",
                        "text": content_text
                    }
                ]
            }
        }

    # 6. Prompts List
    elif method == "prompts/list":
        return {
            "jsonrpc": jsonrpc,
            "id": req_id,
            "result": {"prompts": MCP_PROMPTS}
        }

    # 7. Prompts Get
    elif method == "prompts/get":
        prompt_name = params.get("name")
        args = params.get("arguments", {})
        if prompt_name == "procurement_replenishment_plan":
            template_text = (
                f"You are the NexaERP Alexa+ Autonomous Procurement Agent.\n"
                f"Action Plan: Scan depleted stockouts for urgency='{args.get('urgency', 'ALL')}'. "
                f"Query eligible suppliers, compute total landed costs, and recommend the best vendor. "
                f"If estimated spend exceeds ₹50,000, enforce human approval."
            )
        else:
            template_text = f"You are the NexaERP Alexa+ Agent. Execute business intent for '{prompt_name}' using authorized typed tools."

        return {
            "jsonrpc": jsonrpc,
            "id": req_id,
            "result": {
                "description": f"Prompt template for {prompt_name}",
                "messages": [
                    {
                        "role": "user",
                        "content": {"type": "text", "text": template_text}
                    }
                ]
            }
        }

    # Unknown Method
    else:
        return {
            "jsonrpc": jsonrpc,
            "id": req_id,
            "error": {"code": -32601, "message": f"Method '{method}' not implemented on NexaERP MCP server."}
        }
