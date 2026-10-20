import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales import SalesOrder, SalesOrderItem, Customer
from app.models.inventory import Product
from app.schemas.sales import SalesOrderCreate
from app.services.inventory_service import adjust_product_stock

async def create_sales_order(
    db: AsyncSession,
    order_in: SalesOrderCreate,
    cashier_user_id: int
) -> SalesOrder:
    # Generate unique invoice number
    invoice_number = f"INV-{uuid.uuid4().hex[:6].upper()}"

    subtotal = Decimal("0.00")
    tax_amount = Decimal("0.00")
    order_items: List[SalesOrderItem] = []

    for item_in in order_in.items:
        prod_res = await db.execute(select(Product).where(Product.id == item_in.product_id))
        product = prod_res.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item_in.product_id} not found"
            )

        if product.current_stock < item_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.current_stock}, requested: {item_in.quantity}"
            )

        unit_price = Decimal(str(product.selling_price))
        line_total = unit_price * item_in.quantity
        subtotal += line_total

        # Tax calculation
        if product.tax_rate_percent and product.tax_rate_percent > 0:
            tax_amount += (line_total * Decimal(str(product.tax_rate_percent))) / Decimal("100.00")

        order_item = SalesOrderItem(
            product_id=product.id,
            product_name=product.name,
            quantity=item_in.quantity,
            unit_price=unit_price,
            line_total=line_total
        )
        order_items.append(order_item)

        # Automatically decrement inventory
        await adjust_product_stock(
            db=db,
            product_id=product.id,
            quantity_change=-item_in.quantity,
            movement_type="SALE_OUT",
            user_id=cashier_user_id,
            reference_id=invoice_number,
            notes=f"POS Sale: {invoice_number}"
        )

    discount = Decimal(str(order_in.discount_amount))
    total_amount = subtotal + tax_amount - discount
    if total_amount < Decimal("0.00"):
        total_amount = Decimal("0.00")

    sales_order = SalesOrder(
        invoice_number=invoice_number,
        customer_id=order_in.customer_id,
        branch_id=order_in.branch_id,
        cashier_user_id=cashier_user_id,
        subtotal=subtotal,
        discount_amount=discount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        payment_method=order_in.payment_method,
        payment_status="PAID",
        order_status="COMPLETED",
        notes=order_in.notes,
        items=order_items
    )
    db.add(sales_order)

    # Update customer spend if customer specified
    if order_in.customer_id:
        cust_res = await db.execute(select(Customer).where(Customer.id == order_in.customer_id))
        customer = cust_res.scalar_one_or_none()
        if customer:
            customer.total_spend = (customer.total_spend or Decimal("0.00")) + total_amount

    await db.flush()
    return sales_order
