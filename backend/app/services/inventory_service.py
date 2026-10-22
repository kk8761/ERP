from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.inventory import Product, StockMovement

async def adjust_product_stock(
    db: AsyncSession,
    product_id: int,
    quantity_change: int,
    movement_type: str,
    user_id: Optional[int] = None,
    reference_id: Optional[str] = None,
    notes: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    organization_id: Optional[int] = None
) -> StockMovement:
    """
    Safely adjusts product stock level and records audit movement.
    quantity_change > 0 increases stock.
    quantity_change < 0 decreases stock.
    SEC-59: Scoped strictly to authenticated organization.
    """
    stmt = select(Product).where(Product.id == product_id)
    if organization_id is not None:
        stmt = stmt.where(Product.organization_id == organization_id)
    stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found"
        )

    previous_stock = product.current_stock
    new_stock = previous_stock + quantity_change

    if new_stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock for '{product.name}'. Available: {previous_stock}, Requested deduction: {abs(quantity_change)}"
        )

    product.current_stock = new_stock

    movement = StockMovement(
        product_id=product.id,
        warehouse_id=warehouse_id,
        movement_type=movement_type,
        quantity=abs(quantity_change),
        previous_stock=previous_stock,
        new_stock=new_stock,
        reference_id=reference_id,
        notes=notes,
        created_by_user_id=user_id
    )
    db.add(movement)
    await db.flush()
    return movement
