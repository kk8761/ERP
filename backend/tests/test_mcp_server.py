import pytest
import json
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_mcp_initialize_and_manifest(client: AsyncClient):
    """
    Verify Model Context Protocol (MCP) Server initialization and manifest:
    - Standard JSON-RPC 2.0 initialize request returns protocolVersion and capabilities
    - /api/mcp/manifest endpoint returns serverInfo and tools count
    """
    # 1. JSON-RPC Initialize
    init_payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "alexa-plus-test-client", "version": "1.0.0"}
        }
    }
    res = await client.post("/api/mcp", json=init_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["jsonrpc"] == "2.0"
    assert data["id"] == 1
    result = data["result"]
    assert result["protocolVersion"] == "2024-11-05"
    assert "tools" in result["capabilities"]
    assert "resources" in result["capabilities"]
    assert "prompts" in result["capabilities"]
    assert result["serverInfo"]["name"] == "nexaerp-alexa-mcp-server"

    # 2. Manifest endpoint
    man_res = await client.get("/api/mcp/manifest")
    assert man_res.status_code == 200
    man = man_res.json()
    assert man["capabilities"]["tools"] >= 10
    assert man["capabilities"]["resources"] >= 4


@pytest.mark.asyncio
@pytest.mark.asyncio
async def test_mcp_tools_list_and_call(client: AsyncClient, admin_auth_token: str):
    """
    Verify MCP Tools List & Call:
    - tools/list exposes schemas
    - Unauthenticated tools/call is REJECTED (SEC-02)
    - Authenticated tools/call succeeds using caller identity
    """
    # 1. tools/list (public metadata)
    tools_payload = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    }
    t_res = await client.post("/api/mcp", json=tools_payload)
    assert t_res.status_code == 200
    t_data = t_res.json()
    tools = t_data["result"]["tools"]
    tool_names = [t["name"] for t in tools]
    assert "search_inventory" in tool_names
    assert "compare_suppliers" in tool_names
    assert "get_vendor_scorecard" in tool_names
    assert "create_draft_purchase_order" in tool_names

    # 2. tools/call WITHOUT auth MUST FAIL with error -32001
    call_payload = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "search_inventory",
            "arguments": {"low_stock_only": True}
        }
    }
    client.cookies.clear()
    unauth_res = await client.post("/api/mcp", json=call_payload)
    assert unauth_res.status_code == 200
    unauth_data = unauth_res.json()
    assert "error" in unauth_data
    assert unauth_data["error"]["code"] == -32001

    # 3. tools/call WITH admin_auth_token MUST SUCCEED
    c_res = await client.post(
        "/api/mcp",
        json=call_payload,
        headers={"Authorization": f"Bearer {admin_auth_token}"}
    )
    assert c_res.status_code == 200
    c_data = c_res.json()
    assert c_data.get("result", {}).get("isError") is False
    content_text = c_data["result"]["content"][0]["text"]
    parsed_result = json.loads(content_text)
    assert "count" in parsed_result
    assert "items" in parsed_result


@pytest.mark.asyncio
async def test_mcp_resources_list_and_read(client: AsyncClient, admin_auth_token: str):
    """
    Verify MCP Resources List & Read:
    - resources/list lists available ERP resource URIs
    - resources/read requires auth and returns live low-stock ledger
    """
    # 1. resources/list
    r_list_req = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "resources/list"
    }
    list_res = await client.post("/api/mcp", json=r_list_req)
    assert list_res.status_code == 200
    r_list = list_res.json()["result"]["resources"]
    uris = [r["uri"] for r in r_list]
    assert "erp://inventory/low-stock" in uris
    assert "erp://procurement/vendor-scorecards" in uris

    # 2. resources/read with auth
    r_read_req = {
        "jsonrpc": "2.0",
        "id": 5,
        "method": "resources/read",
        "params": {"uri": "erp://inventory/low-stock"}
    }
    read_res = await client.post(
        "/api/mcp",
        json=r_read_req,
        headers={"Authorization": f"Bearer {admin_auth_token}"}
    )
    assert read_res.status_code == 200
    contents = read_res.json()["result"]["contents"]
    assert len(contents) > 0
    assert contents[0]["uri"] == "erp://inventory/low-stock"
    assert contents[0]["mimeType"] == "application/json"


@pytest.mark.asyncio
async def test_mcp_prompts_list_and_get(client: AsyncClient, admin_auth_token: str):
    """
    Verify MCP Prompts List & Get:
    - prompts/list returns registered workflow prompt templates
    - prompts/get returns structured prompt template with arguments filled
    """
    # 1. prompts/list
    p_list_req = {
        "jsonrpc": "2.0",
        "id": 6,
        "method": "prompts/list"
    }
    list_res = await client.post("/api/mcp", json=p_list_req)
    assert list_res.status_code == 200
    prompts = list_res.json()["result"]["prompts"]
    prompt_names = [p["name"] for p in prompts]
    assert "procurement_replenishment_plan" in prompt_names

    # 2. prompts/get
    p_get_req = {
        "jsonrpc": "2.0",
        "id": 7,
        "method": "prompts/get",
        "params": {
            "name": "procurement_replenishment_plan",
            "arguments": {"urgency": "CRITICAL"}
        }
    }
    get_res = await client.post(
        "/api/mcp",
        json=p_get_req,
        headers={"Authorization": f"Bearer {admin_auth_token}"}
    )
    assert get_res.status_code == 200
    res_data = get_res.json()["result"]
    assert len(res_data["messages"]) > 0
    assert "CRITICAL" in res_data["messages"][0]["content"]["text"]


@pytest.mark.asyncio
async def test_mcp_metadata_endpoints_auth(client: AsyncClient, admin_auth_token: str):
    """
    Verify SEC-12: /api/mcp/tools and /api/mcp/resources require authenticated credentials.
    """
    client.cookies.clear()
    unauth_tools = await client.get("/api/mcp/tools")
    assert unauth_tools.status_code == 401

    auth_tools = await client.get("/api/mcp/tools", headers={"Authorization": f"Bearer {admin_auth_token}"})
    assert auth_tools.status_code == 200
    assert len(auth_tools.json()["tools"]) > 0

