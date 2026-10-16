import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.procurement import Supplier, PurchaseOrder, PurchaseOrderItem
from app.models.inventory import Product
from app.schemas.procurement import (
    SupplierCreate, SupplierOut,
    PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderItemOut
)
from app.services.inventory_service import adjust_product_stock
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/procurement", tags=["Procurement"])

@router.get("/suppliers", response_model=List[SupplierOut])
async def list_suppliers(
    current_user: User = Depends(require_permission("procurement.view")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Supplier).order_by(Supplier.name.asc()))
    return res.scalars().all()

@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    current_user: User = Depends(require_permission("procurement.create")),
    db: AsyncSession = Depends(get_db)
):
    supplier_data = data.model_dump()
    if not supplier_data.get("vendor_code"):
        supplier_data["vendor_code"] = f"VEND-{uuid.uuid4().hex[:5].upper()}"

    supplier = Supplier(**supplier_data)
    db.add(supplier)
    await record_audit_log(
        db, action="SUPPLIER_CREATED", entity_name="Supplier",
        user_id=current_user.id, user_email=current_user.email,
        details={"name": supplier.name, "vendor_code": supplier.vendor_code}
    )
    await db.commit()
    await db.refresh(supplier)
    return supplier

@router.patch("/suppliers/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: int,
    data: dict,
    current_user: User = Depends(require_permission("procurement.create")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = res.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Vendor not found")

    for k, v in data.items():
        if hasattr(supplier, k) and v is not None:
            setattr(supplier, k, v)

    await record_audit_log(
        db, action="SUPPLIER_UPDATED", entity_name="Supplier",
        entity_id=str(supplier.id), user_id=current_user.id,
        user_email=current_user.email, details=data
    )
    await db.commit()
    await db.refresh(supplier)
    return supplier

@router.get("/purchase-orders", response_model=List[PurchaseOrderOut])
async def list_purchase_orders(
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("procurement.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.supplier), selectinload(PurchaseOrder.items))
        .order_by(desc(PurchaseOrder.created_at))
    )
    if status:
        stmt = stmt.where(PurchaseOrder.status == status)

    res = await db.execute(stmt)
    pos = res.scalars().all()

    out = []
    for po in pos:
        items_out = [
            PurchaseOrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity_ordered=item.quantity_ordered,
                quantity_received=item.quantity_received,
                unit_cost=item.unit_cost,
                line_total=item.line_total
            )
            for item in po.items
        ]
        out.append(PurchaseOrderOut(
            id=po.id,
            po_number=po.po_number,
            supplier_id=po.supplier_id,
            supplier_name=po.supplier.name if po.supplier else None,
            status=po.status,
            total_amount=po.total_amount,
            notes=po.notes,
            created_at=po.created_at,
            items=items_out
        ))
    return out

@router.post("/purchase-orders", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user: User = Depends(require_permission("procurement.create")),
    db: AsyncSession = Depends(get_db)
):
    po_number = f"PO-{uuid.uuid4().hex[:6].upper()}"
    total = Decimal("0.00")
    items: List[PurchaseOrderItem] = []

    for item_in in data.items:
        prod_res = await db.execute(select(Product).where(Product.id == item_in.product_id))
        prod = prod_res.scalar_one_or_none()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product ID {item_in.product_id} not found")

        line_total = item_in.unit_cost * item_in.quantity
        total += line_total

        po_item = PurchaseOrderItem(
            product_id=prod.id,
            product_name=prod.name,
            quantity_ordered=item_in.quantity,
            quantity_received=0,
            unit_cost=item_in.unit_cost,
            line_total=line_total
        )
        items.append(po_item)

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=data.supplier_id,
        branch_id=data.branch_id,
        created_by_user_id=current_user.id,
        status="DRAFT",
        total_amount=total,
        notes=data.notes,
        items=items
    )
    db.add(po)
    await record_audit_log(
        db, action="PO_CREATED", entity_name="PurchaseOrder",
        user_id=current_user.id, user_email=current_user.email,
        details={"po_number": po_number, "total": float(total)}
    )
    await db.commit()
    await db.refresh(po)

    # Re-fetch
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.supplier), selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po.id)
    )
    res = await db.execute(stmt)
    full_po = res.scalar_one()

    return PurchaseOrderOut(
        id=full_po.id,
        po_number=full_po.po_number,
        supplier_id=full_po.supplier_id,
        supplier_name=full_po.supplier.name if full_po.supplier else None,
        status=full_po.status,
        total_amount=full_po.total_amount,
        notes=full_po.notes,
        created_at=full_po.created_at,
        items=[
            PurchaseOrderItemOut(
                id=i.id, product_id=i.product_id, product_name=i.product_name,
                quantity_ordered=i.quantity_ordered, quantity_received=i.quantity_received,
                unit_cost=i.unit_cost, line_total=i.line_total
            ) for i in full_po.items
        ]
    )

@router.post("/purchase-orders/{po_id}/approve")
async def approve_po(
    po_id: int,
    current_user: User = Depends(require_permission("procurement.approve")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po.status = "APPROVED"
    po.approved_by_user_id = current_user.id
    await record_audit_log(
        db, action="PO_APPROVED", entity_name="PurchaseOrder",
        entity_id=str(po.id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS"
    )
    await db.commit()
    return {"message": f"Purchase order {po.po_number} approved"}

@router.post("/purchase-orders/{po_id}/receive")
async def receive_goods(
    po_id: int,
    current_user: User = Depends(require_permission("procurement.receive")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po_id)
    res = await db.execute(stmt)
    po = res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Purchase order must be APPROVED before goods receipt")

    # Increment stock for each item
    for item in po.items:
        item.quantity_received = item.quantity_ordered
        await adjust_product_stock(
            db=db,
            product_id=item.product_id,
            quantity_change=item.quantity_ordered,
            movement_type="PURCHASE_IN",
            user_id=current_user.id,
            reference_id=po.po_number,
            notes=f"Goods receipt for {po.po_number}"
        )

    po.status = "RECEIVED"
    await record_audit_log(
        db, action="PO_RECEIVED", entity_name="PurchaseOrder",
        entity_id=str(po.id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={"po": po.po_number, "items_count": len(po.items)}
    )
    await db.commit()
    return {"message": f"Goods received for {po.po_number} and inventory stocks replenished"}
