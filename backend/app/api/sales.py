from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.sales import SalesOrder, SalesOrderItem, Customer
from app.models.inventory import Product
from app.schemas.sales import (
    CustomerCreate, CustomerOut,
    SalesOrderCreate, SalesOrderOut, SalesOrderItemOut
)
from app.services.sales_service import create_sales_order
from app.services.inventory_service import adjust_product_stock
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/sales", tags=["Sales"])

@router.get("/orders", response_model=List[SalesOrderOut])
async def list_sales_orders(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("sales.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(SalesOrder)
        .options(
            selectinload(SalesOrder.customer),
            selectinload(SalesOrder.items).selectinload(SalesOrderItem.product)
        )
        .order_by(desc(SalesOrder.created_at))
    )
    if status:
        stmt = stmt.where(SalesOrder.order_status == status)
    if search:
        stmt = stmt.where(SalesOrder.invoice_number.ilike(f"%{search}%"))

    # Branch Isolation (SEC-15): Scope order listings to the user's branch unless executive / global administrator
    is_global_admin = current_user.is_superuser or any(
        r.role and r.role.name in ["System Administrator", "Executive", "Managing Director"]
        for r in getattr(current_user, "roles", [])
    )
    if not is_global_admin and current_user.branch_id:
        stmt = stmt.where(SalesOrder.branch_id == current_user.branch_id)

    result = await db.execute(stmt)
    orders = result.scalars().all()

    out = []
    for o in orders:
        items_out = [
            SalesOrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total
            )
            for item in o.items
        ]
        out.append(SalesOrderOut(
            id=o.id,
            invoice_number=o.invoice_number,
            customer_id=o.customer_id,
            customer_name=o.customer.name if o.customer else "Walk-in Customer",
            branch_id=o.branch_id,
            cashier_user_id=o.cashier_user_id,
            subtotal=o.subtotal,
            discount_amount=o.discount_amount,
            tax_amount=o.tax_amount,
            total_amount=o.total_amount,
            payment_method=o.payment_method,
            payment_status=o.payment_status,
            order_status=o.order_status,
            notes=o.notes,
            created_at=o.created_at,
            items=items_out
        ))
    return out

@router.post("/orders", response_model=SalesOrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_in: SalesOrderCreate,
    current_user: User = Depends(require_permission("sales.create")),
    db: AsyncSession = Depends(get_db)
):
    order = await create_sales_order(
        db=db,
        order_in=order_in,
        cashier_user_id=current_user.id
    )
    await record_audit_log(
        db, action="SALE_COMPLETED", entity_name="SalesOrder",
        entity_id=str(order.id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={"invoice": order.invoice_number, "total": float(order.total_amount)}
    )
    await db.commit()
    await db.refresh(order)

    # Re-fetch with items and customer
    stmt = (
        select(SalesOrder)
        .options(selectinload(SalesOrder.customer), selectinload(SalesOrder.items))
        .where(SalesOrder.id == order.id)
    )
    res = await db.execute(stmt)
    full_order = res.scalar_one()

    items_out = [
        SalesOrderItemOut(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.line_total
        )
        for item in full_order.items
    ]

    return SalesOrderOut(
        id=full_order.id,
        invoice_number=full_order.invoice_number,
        customer_id=full_order.customer_id,
        customer_name=full_order.customer.name if full_order.customer else "Walk-in Customer",
        branch_id=full_order.branch_id,
        cashier_user_id=full_order.cashier_user_id,
        subtotal=full_order.subtotal,
        discount_amount=full_order.discount_amount,
        tax_amount=full_order.tax_amount,
        total_amount=full_order.total_amount,
        payment_method=full_order.payment_method,
        payment_status=full_order.payment_status,
        order_status=full_order.order_status,
        notes=full_order.notes,
        created_at=full_order.created_at,
        items=items_out
    )

@router.post("/orders/{order_id}/refund")
async def refund_order(
    order_id: int,
    current_user: User = Depends(require_permission("sales.refund")),
    db: AsyncSession = Depends(get_db)
):
    # Atomic row locking & branch isolation (BUG-05 & SEC-15)
    stmt = (
        select(SalesOrder)
        .options(selectinload(SalesOrder.items), selectinload(SalesOrder.customer))
        .where(SalesOrder.id == order_id)
        .with_for_update()
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    is_global_admin = current_user.is_superuser or any(
        r.role and r.role.name in ["System Administrator", "Executive", "Managing Director"]
        for r in getattr(current_user, "roles", [])
    )
    if not is_global_admin and current_user.branch_id and order.branch_id and order.branch_id != current_user.branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-branch refund denied: Order was issued by a different branch."
        )

    # Idempotent validation
    if order.order_status in ["RETURNED", "CANCELLED"] or order.payment_status == "REFUNDED":
        raise HTTPException(status_code=400, detail="Order is already returned and refunded. Duplicate refund prevented.")

    # Atomically restore inventory for each item
    for item in order.items:
        await adjust_product_stock(
            db=db,
            product_id=item.product_id,
            quantity_change=item.quantity,
            movement_type="RETURN_IN",
            user_id=current_user.id,
            reference_id=order.invoice_number,
            notes=f"Return refund for {order.invoice_number}"
        )

    order.order_status = "RETURNED"
    order.payment_status = "REFUNDED"

    # Reconcile customer total spend if assigned
    if order.customer:
        order.customer.total_spend = max(Decimal("0.00"), (order.customer.total_spend or Decimal("0.00")) - order.total_amount)

    await record_audit_log(
        db, action="SALE_REFUNDED", entity_name="SalesOrder",
        entity_id=str(order.id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={"invoice": order.invoice_number, "refund_amount": float(order.total_amount), "branch_id": order.branch_id}
    )
    await db.commit()
    return {"message": f"Order {order.invoice_number} successfully refunded and stock replenished"}

@router.get("/customers", response_model=List[CustomerOut])
async def list_customers(
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("sales.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Customer).order_by(Customer.name.asc())
    if search:
        stmt = stmt.where(
            (Customer.name.ilike(f"%{search}%")) |
            (Customer.phone.ilike(f"%{search}%"))
        )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    current_user: User = Depends(require_permission("customers.manage")),
    db: AsyncSession = Depends(get_db)
):
    customer = Customer(**data.model_dump())
    db.add(customer)
    await record_audit_log(
        db, action="CUSTOMER_CREATED", entity_name="Customer",
        user_id=current_user.id, user_email=current_user.email,
        details={"name": customer.name, "phone": customer.phone}
    )
    await db.commit()
    await db.refresh(customer)
    return customer
