import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_sales_and_inventory_transaction_integrity(
    client: AsyncClient,
    admin_auth_token: str
):
    import uuid
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    unique_suffix = uuid.uuid4().hex[:6].upper()
    test_sku = f"TEA-TEST-{unique_suffix}"
    test_barcode = f"BAR-{unique_suffix}"

    # 1. Create a test product with initial stock 10
    prod_res = await client.post(
        "/api/inventory/products",
        headers=headers,
        json={
            "name": "Organic Green Tea (250g)",
            "sku": test_sku,
            "barcode": test_barcode,
            "selling_price": "180.00",
            "cost_price": "120.00",
            "tax_rate_percent": "5.00",
            "reorder_level": 5,
            "current_stock": 10
        }
    )
    assert prod_res.status_code == 201
    prod = prod_res.json()
    prod_id = prod["id"]
    assert prod["current_stock"] == 10

    # 2. Place a sales order for 4 units
    order_res = await client.post(
        "/api/sales/orders",
        headers=headers,
        json={
            "items": [{"product_id": prod_id, "quantity": 4}],
            "discount_amount": "0.00",
            "payment_method": "UPI"
        }
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["payment_status"] == "PAID"
    # Subtotal must be 4 * 180 = 720.00
    assert float(order_data["subtotal"]) == 720.00

    # 3. Verify product stock was automatically decremented to 6 (10 - 4 = 6)
    get_prod = await client.get("/api/inventory/products", headers=headers, params={"search": test_sku})
    assert get_prod.status_code == 200
    prods = get_prod.json()
    assert len(prods) == 1
    assert prods[0]["current_stock"] == 6

    # 4. Attempt to sell more than available stock (e.g. 10 units when only 6 left)
    over_res = await client.post(
        "/api/sales/orders",
        headers=headers,
        json={
            "items": [{"product_id": prod_id, "quantity": 10}],
            "payment_method": "CASH"
        }
    )
    assert over_res.status_code == 400
    assert "Insufficient stock" in over_res.json()["detail"]

    # 5. Process refund for the order -> stock should be replenished back to 10
    refund_res = await client.post(
        f"/api/sales/orders/{order_data['id']}/refund",
        headers=headers
    )
    assert refund_res.status_code == 200

    get_prod_after_refund = await client.get("/api/inventory/products", headers=headers, params={"search": test_sku})
    assert get_prod_after_refund.json()[0]["current_stock"] == 10
