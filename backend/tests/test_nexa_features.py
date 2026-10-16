import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_manufacturing_endpoints(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    
    # 1. Metrics & OEE
    res = await client.get("/api/manufacturing/metrics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "oee" in data
    assert data["oee"]["overall_oee"] > 0
    assert "work_centers_online" in data

    # 2. Production Orders
    res = await client.get("/api/manufacturing/orders", headers=headers)
    assert res.status_code == 200
    orders = res.json()
    assert len(orders) >= 1

    # 3. Work Centers
    res = await client.get("/api/manufacturing/work-centers", headers=headers)
    assert res.status_code == 200
    wcs = res.json()
    assert len(wcs) >= 1

    # 4. BOMs
    res = await client.get("/api/manufacturing/boms", headers=headers)
    assert res.status_code == 200
    boms = res.json()
    assert len(boms) >= 1

    # 5. MRP Run
    res = await client.post("/api/manufacturing/mrp-run", headers=headers)
    assert res.status_code == 200
    mrp = res.json()
    assert mrp["status"] == "SUCCESS"
    assert "net_shortage" in mrp

@pytest.mark.asyncio
async def test_grc_endpoints(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Metrics
    res = await client.get("/api/grc/metrics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["overall_compliance_score"] > 90

    # 2. Risks Register
    res = await client.get("/api/grc/risks", headers=headers)
    assert res.status_code == 200
    risks = res.json()
    assert len(risks) >= 3

    # 3. Compliance Frameworks
    res = await client.get("/api/grc/frameworks", headers=headers)
    assert res.status_code == 200
    fws = res.json()
    assert any(f["id"] == "FW-ISO27001" for f in fws)

    # 4. Audit Log Items
    res = await client.get("/api/grc/audits", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

@pytest.mark.asyncio
async def test_predictive_ai_endpoints(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Demand Forecast
    res = await client.get("/api/predictive/demand-forecast?horizon_days=14", headers=headers)
    assert res.status_code == 200
    forecast = res.json()
    assert len(forecast["forecast"]) == 14
    assert forecast["training_accuracy"] > 90

    # 2. Predictive Maintenance
    res = await client.get("/api/predictive/predictive-maintenance", headers=headers)
    assert res.status_code == 200
    maint = res.json()
    assert len(maint) >= 2
    assert "remaining_useful_life_hours" in maint[0]

    # 3. What-If Scenario Simulation
    res = await client.post("/api/predictive/what-if-simulation", headers=headers, json={
        "price_change_percent": 5.0,
        "demand_shock_percent": -2.0,
        "cogs_inflation_percent": 4.0,
        "lead_time_buffer_days": 3
    })
    assert res.status_code == 200
    sim = res.json()
    assert sim["status"] == "COMPLETED"
    assert "projected_gross_margin" in sim["simulation"]
    assert "executive_recommendation" in sim

@pytest.mark.asyncio
async def test_stock_exhaustion_predictions(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    for seg in ["all", "retail_b2c", "wholesale_b2b", "enterprise_contract", "surge_promo"]:
        res = await client.get(f"/api/inventory/stock-exhaustion-predictions?consumer_segment={seg}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "predictions" in data
        assert "summary" in data
        assert "available_segments" in data
        assert data["consumer_segment"] == seg
        for item in data["predictions"]:
            assert "days_until_exhaustion" in item
            assert "projected_exhaustion_date" in item
            assert "urgency" in item
            assert "recommended_reorder_qty" in item
