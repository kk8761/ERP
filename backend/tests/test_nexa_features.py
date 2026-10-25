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
            assert "sales_today" in item
            assert "avg_daily_sales_7d" in item
            assert "sales_trend" in item

@pytest.mark.asyncio
async def test_stock_exhaustion_dynamic_with_daily_sales(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    
    # 1. Fetch initial prediction for all products
    initial_res = await client.get("/api/inventory/stock-exhaustion-predictions?consumer_segment=all", headers=headers)
    assert initial_res.status_code == 200
    initial_data = initial_res.json()
    assert len(initial_data["predictions"]) > 0

    target = next((p for p in initial_data["predictions"] if p["current_stock"] >= 10), initial_data["predictions"][0])
    target_id = target["product_id"]
    initial_days = target["days_until_exhaustion"]
    initial_burn = target["daily_burn_rate"]

    # 2. Record a daily sale transaction of 5 units
    sale_res = await client.post(
        "/api/inventory/stock-exhaustion-predictions/record-daily-sale",
        headers=headers,
        json={
            "product_id": target_id,
            "quantity": 3,
            "notes": "Testing dynamic daily sales stock exhaustion"
        }
    )
    assert sale_res.status_code == 200
    sale_data = sale_res.json()
    assert sale_data["success"] is True
    assert sale_data["quantity_sold"] == 3
    assert sale_data["sales_today"] >= 3

    # 3. Fetch refreshed predictions and verify the prediction changed dynamically
    refreshed_res = await client.get("/api/inventory/stock-exhaustion-predictions?consumer_segment=all", headers=headers)
    assert refreshed_res.status_code == 200
    refreshed_data = refreshed_res.json()

    refreshed_target = next(p for p in refreshed_data["predictions"] if p["product_id"] == target_id)
    assert refreshed_target["sales_today"] >= 3
    # With new sales today, daily burn rate increases and days left decreases
    assert refreshed_target["daily_burn_rate"] >= initial_burn
    assert refreshed_target["days_until_exhaustion"] < initial_days
    assert refreshed_target["has_live_sales"] is True

