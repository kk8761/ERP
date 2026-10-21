import pytest
from httpx import AsyncClient
from app.config import settings

@pytest.mark.asyncio
async def test_aws_cloud_status_and_telemetry(client: AsyncClient, admin_auth_token: str):
    """
    Verify AWS Cloud Architecture integration:
    - Status endpoint reports Bedrock, S3, SNS, CloudWatch, and Alexa+ readiness
    - Test alert emits CloudWatch metric and stores in SNS buffer
    - S3 presigned URL generator returns valid endpoint
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. AWS Status
    status_res = await client.get("/api/aws/status", headers=headers)
    assert status_res.status_code == 200
    data = status_res.json()
    assert "bedrock" in data
    assert "s3" in data
    assert "sns" in data
    assert "cloudwatch" in data
    assert "alexa_plus" in data
    assert data["alexa_plus"]["multimodal_apl_enabled"] is True

    # 2. Trigger test alert
    alert_res = await client.post(
        "/api/aws/test-alert?subject=Test+Autonomous+Audit&message=Audit+completed+successfully",
        headers=headers
    )
    assert alert_res.status_code == 200
    alert_data = alert_res.json()
    assert alert_data["status"] == "SUCCESS"
    assert alert_data["sns_event"]["subject"] == "Test Autonomous Audit"

    # 3. Check telemetry endpoint
    tel_res = await client.get("/api/aws/telemetry", headers=headers)
    assert tel_res.status_code == 200
    tel_data = tel_res.json()
    assert len(tel_data["sns_alerts"]) > 0
    assert len(tel_data["cloudwatch_events"]) > 0

    # 4. S3 Presigned URL
    s3_res = await client.get("/api/aws/s3/presigned-url?key=receipts/po-101.pdf", headers=headers)
    assert s3_res.status_code == 200
    s3_data = s3_res.json()
    assert "presigned_url" in s3_data
    assert "s3." in s3_data["presigned_url"]


@pytest.mark.asyncio
async def test_alexa_launch_and_multimodal_apl(client: AsyncClient):
    """
    Verify Alexa+ Voice Skill Webhook:
    - LaunchRequest returns voice SSML
    - Alexa Presentation Language (APL 2024.1) directive generated for Fire TV / Echo Show
    """
    req_payload = {
        "version": "1.0",
        "request": {
            "type": "LaunchRequest",
            "requestId": "amzn1.echo-api.request.launch-001"
        }
    }
    res = await client.post("/api/alexa/skill", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    speech = data["response"]["outputSpeech"]["ssml"]
    assert "Nexa ERP" in speech
    assert "<speak>" in speech

    # Check APL directive for Fire TV / Echo screens
    directives = data["response"]["directives"]
    assert len(directives) > 0
    apl = directives[0]
    assert apl["type"] == "Alexa.Presentation.APL.RenderDocument"
    assert apl["document"]["type"] == "APL"
    assert "cards" in apl["datasources"]["data"]


@pytest.mark.asyncio
async def test_alexa_low_stock_and_vendor_compare_intents(client: AsyncClient):
    """
    Verify Alexa+ Multimodal intents:
    - LowStockIntent returns voice summary and red-badge deficit cards
    - VendorCompareIntent returns top-recommended supplier and quote comparison carousel
    """
    # 1. LowStockIntent
    low_stock_req = {
        "version": "1.0",
        "request": {
            "type": "IntentRequest",
            "intent": {"name": "LowStockIntent"}
        }
    }
    low_res = await client.post("/api/alexa/skill", json=low_stock_req)
    assert low_res.status_code == 200
    low_data = low_res.json()
    assert "<speak>" in low_data["response"]["outputSpeech"]["ssml"]
    assert len(low_data["response"]["directives"]) > 0

    # 2. VendorCompareIntent
    compare_req = {
        "version": "1.0",
        "request": {
            "type": "IntentRequest",
            "intent": {
                "name": "VendorCompareIntent",
                "slots": {"Product": {"value": "Basmati Rice"}}
            }
        }
    }
    comp_res = await client.post("/api/alexa/skill", json=compare_req)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    comp_speech = comp_data["response"]["outputSpeech"]["ssml"]
    assert "recommended" in comp_speech.lower() or "supplier" in comp_speech.lower()
    assert len(comp_data["response"]["directives"]) > 0


@pytest.mark.asyncio
async def test_alexa_vendor_scorecard_and_sales_summary(client: AsyncClient):
    """
    Verify Alexa+ VendorScorecardIntent and SalesSummaryIntent:
    - Speaks star rating, on-time delivery %, quality defect rate
    - Displays interactive breakdown cards
    """
    # 1. VendorScorecardIntent
    sc_req = {
        "version": "1.0",
        "request": {
            "type": "IntentRequest",
            "intent": {
                "name": "VendorScorecardIntent",
                "slots": {"Supplier": {"value": "Adani Wilmar"}}
            }
        }
    }
    sc_res = await client.post("/api/alexa/skill", json=sc_req)
    assert sc_res.status_code == 200
    sc_data = sc_res.json()
    assert "score" in sc_data["response"]["outputSpeech"]["ssml"].lower()

    # 2. SalesSummaryIntent
    sales_req = {
        "version": "1.0",
        "request": {
            "type": "IntentRequest",
            "intent": {"name": "SalesSummaryIntent"}
        }
    }
    sales_res = await client.post("/api/alexa/skill", json=sales_req)
    assert sales_res.status_code == 200
    sales_data = sales_res.json()
    assert "sales" in sales_data["response"]["outputSpeech"]["ssml"].lower() or "revenue" in sales_data["response"]["outputSpeech"]["ssml"].lower()


@pytest.mark.asyncio
async def test_alexa_simulation_endpoint(client: AsyncClient, admin_auth_token: str):
    """Verify in-browser / Fire TV voice simulation API requires auth and returns voice responses."""
    sim_payload = {"query": "Find low-stock products"}
    res = await client.post(
        "/api/alexa/simulate",
        json=sim_payload,
        headers={"Authorization": f"Bearer {admin_auth_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert "outputSpeech" in data["response"]
    assert "directives" in data["response"]


@pytest.mark.asyncio
async def test_approval_routing_workflow_above_threshold(client: AsyncClient, admin_auth_token: str):
    """
    Verify Natural-Language Governance Workflow:
    'Create a workflow that routes purchase requests above ₹50,000 to the finance manager'
    - Detects threshold ₹50,000 and target role 'Finance Manager'
    - Creates persistent WorkflowDefinition with segregation of duties steps
    - Logs CloudWatch telemetry and SNS alert
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    payload = {
        "prompt": "Create a workflow that routes purchase requests above ₹50,000 to the finance manager"
    }
    res = await client.post("/api/ai/command", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["task_type"] == "RECURRING_WORKFLOW"
    assert data["status"] == "COMPLETED"
    assert data["workflow_created"] is not None
    assert "Finance Manager" in data["workflow_created"]["target_role"]
    assert "50000" in data["workflow_created"]["condition"] or "50,000" in data["workflow_created"]["condition"]
    assert len(data["plan_steps"]) >= 2
    assert "50,000" in data["answer"] or "50000" in data["answer"]


@pytest.mark.asyncio
async def test_alexa_simulate_auth(client: AsyncClient, admin_auth_token: str):
    """
    Verify SEC-11: /api/alexa/simulate requires authentication.
    """
    client.cookies.clear()
    unauth_res = await client.post("/api/alexa/simulate", json={"query": "Find low-stock products"})
    assert unauth_res.status_code == 401

    auth_res = await client.post(
        "/api/alexa/simulate",
        json={"query": "Find low-stock products"},
        headers={"Authorization": f"Bearer {admin_auth_token}"}
    )
    assert auth_res.status_code == 200
    data = auth_res.json()
    assert "response" in data


@pytest.mark.asyncio
async def test_aws_security_restrictions(client: AsyncClient, admin_auth_token: str):
    """
    Verify SEC-04: AWS operations require authentication and reject malicious S3 keys.
    """
    client.cookies.clear()
    # 1. Unauthenticated request to /api/aws/status must be rejected with 401
    unauth_status = await client.get("/api/aws/status")
    assert unauth_status.status_code == 401

    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 2. Invalid S3 operation must be rejected with 400
    bad_op = await client.get("/api/aws/s3/presigned-url?key=receipts/doc.pdf&operation=delete_bucket", headers=headers)
    assert bad_op.status_code == 400

    # 3. Path traversal in S3 key must be rejected with 400
    traversal = await client.get("/api/aws/s3/presigned-url?key=receipts/../../etc/passwd", headers=headers)
    assert traversal.status_code == 400

    # 4. Unapproved prefix must be rejected with 403
    unapproved = await client.get("/api/aws/s3/presigned-url?key=private_keys/id_rsa", headers=headers)
    assert unapproved.status_code == 403


