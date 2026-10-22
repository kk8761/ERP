from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.inventory import Product, ProductCategory, StockMovement
from app.models.sales import SalesOrder, SalesOrderItem, Customer
from app.schemas.inventory import (
    ProductCreate, ProductUpdate, ProductOut,
    CategoryCreate, CategoryOut, StockAdjustmentIn
)
from app.schemas.sales import SalesOrderCreate, SalesOrderItemIn
from app.services.inventory_service import adjust_product_stock
from app.services.sales_service import create_sales_order
from app.services.audit_service import record_audit_log

class RecordDailySaleRequest(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1, le=1000)
    branch_id: Optional[int] = None
    notes: Optional[str] = "Store Daily Sale"

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("/products", response_model=List[ProductOut])
async def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    low_stock_only: bool = Query(False),
    current_user: User = Depends(require_permission("inventory.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).options(selectinload(Product.category)).order_by(Product.name.asc())
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if search:
        term = f"%{search}%"
        stmt = stmt.where((Product.name.ilike(term)) | (Product.sku.ilike(term)) | (Product.barcode.ilike(term)))
    if low_stock_only:
        stmt = stmt.where(Product.current_stock <= Product.reorder_level)

    result = await db.execute(stmt)
    products = result.scalars().all()

    out = []
    for p in products:
        status_text = "In Stock"
        if p.current_stock <= 0:
            status_text = "Out of Stock"
        elif p.current_stock <= p.reorder_level:
            status_text = "Low Stock"

        out.append(ProductOut(
            id=p.id,
            name=p.name,
            sku=p.sku,
            barcode=p.barcode,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            unit_of_measure=p.unit_of_measure,
            selling_price=p.selling_price,
            cost_price=p.cost_price,
            tax_rate_percent=p.tax_rate_percent,
            reorder_level=p.reorder_level,
            current_stock=p.current_stock,
            image_url=p.image_url,
            vision_features=p.vision_features,
            is_active=p.is_active,
            status=status_text
        ))
    return out

@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(require_permission("inventory.create")),
    db: AsyncSession = Depends(get_db)
):
    # Check uniqueness of SKU
    existing = await db.execute(select(Product).where(Product.sku == data.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{data.sku}' already exists"
        )

    product = Product(**data.model_dump())
    db.add(product)
    await db.flush()

    if data.current_stock > 0:
        movement = StockMovement(
            product_id=product.id,
            movement_type="PURCHASE_IN",
            quantity=data.current_stock,
            previous_stock=0,
            new_stock=data.current_stock,
            notes="Initial stock opening balance",
            created_by_user_id=current_user.id
        )
        db.add(movement)

    await record_audit_log(
        db, action="PRODUCT_CREATED", entity_name="Product",
        entity_id=str(product.id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={"name": product.name, "sku": product.sku, "stock": product.current_stock}
    )
    await db.commit()
    await db.refresh(product)

    return ProductOut(
        id=product.id,
        name=product.name,
        sku=product.sku,
        barcode=product.barcode,
        category_id=product.category_id,
        unit_of_measure=product.unit_of_measure,
        selling_price=product.selling_price,
        cost_price=product.cost_price,
        tax_rate_percent=product.tax_rate_percent,
        reorder_level=product.reorder_level,
        current_stock=product.current_stock,
        image_url=product.image_url,
        vision_features=product.vision_features,
        is_active=product.is_active,
        status="In Stock" if product.current_stock > product.reorder_level else "Low Stock"
    )

@router.post("/adjust")
async def adjust_stock(
    adj: StockAdjustmentIn,
    current_user: User = Depends(require_permission("inventory.adjust")),
    db: AsyncSession = Depends(get_db)
):
    qty = adj.quantity if adj.adjustment_type == "ADJUSTMENT_IN" else -adj.quantity
    movement = await adjust_product_stock(
        db=db,
        product_id=adj.product_id,
        quantity_change=qty,
        movement_type=adj.adjustment_type,
        user_id=current_user.id,
        notes=adj.notes or "Manual inventory audit adjustment"
    )
    await record_audit_log(
        db, action="INVENTORY_ADJUSTMENT", entity_name="Product",
        entity_id=str(adj.product_id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={"type": adj.adjustment_type, "qty": adj.quantity, "new_stock": movement.new_stock}
    )
    await db.commit()
    return {"message": "Inventory successfully adjusted", "new_stock": movement.new_stock}

class ProductSpecificAdjustmentIn(BaseModel):
    quantity_delta: Optional[int] = None
    quantity: Optional[int] = None
    movement_type: Optional[str] = None
    adjustment_type: Optional[str] = None
    notes: Optional[str] = None

@router.post("/products/{product_id}/adjust")
async def adjust_specific_product_stock(
    product_id: int,
    adj: ProductSpecificAdjustmentIn,
    current_user: User = Depends(require_permission("inventory.adjust")),
    db: AsyncSession = Depends(get_db)
):
    if adj.quantity_delta is not None:
        qty = adj.quantity_delta
        m_type = adj.movement_type or ("ADJUSTMENT_IN" if qty > 0 else "ADJUSTMENT_OUT")
    else:
        q = adj.quantity if adj.quantity is not None else 1
        m_type = adj.movement_type or adj.adjustment_type or "ADJUSTMENT_IN"
        qty = q if m_type == "ADJUSTMENT_IN" else -abs(q)

    movement = await adjust_product_stock(
        db=db,
        product_id=product_id,
        quantity_change=qty,
        movement_type=m_type,
        user_id=current_user.id,
        notes=adj.notes or "Manual inventory audit adjustment"
    )
    await record_audit_log(
        db, action="INVENTORY_ADJUSTMENT", entity_name="Product",
        entity_id=str(product_id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={"type": m_type, "qty_delta": qty, "new_stock": movement.new_stock}
    )
    await db.commit()
    return {"message": "Inventory successfully adjusted", "new_stock": movement.new_stock}

@router.get("/categories", response_model=List[CategoryOut])
async def list_categories(
    current_user: User = Depends(require_permission("inventory.view")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ProductCategory).order_by(ProductCategory.name.asc()))
    return res.scalars().all()

@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    cat: CategoryCreate,
    current_user: User = Depends(require_permission("inventory.create")),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(ProductCategory).where(ProductCategory.code == cat.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category code already exists")

    new_cat = ProductCategory(**cat.model_dump())
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    return new_cat

@router.get("/stock-exhaustion-predictions")
async def get_stock_exhaustion_predictions(
    consumer_segment: str = Query("all", description="Consumer profile: all, retail_b2c, wholesale_b2b, enterprise_contract, surge_promo"),
    branch_id: Optional[int] = Query(None, description="Optional branch ID to isolate regional velocity"),
    current_user: User = Depends(require_permission("inventory.view")),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Predicts in how many days current stock will be exhausted.
    Dynamically recalculates based on every single day's sales transactions,
    factoring in today's sales volume, 7-day velocity, and 30-day moving average.
    """
    segment_profiles = {
        "all": {
            "name": "All Consumers (Blended Average)",
            "multiplier": 1.0,
            "description": "Blended store-wide average consumer demand across retail, walk-in, and routine orders."
        },
        "retail_b2c": {
            "name": "Retail Direct (Walk-in & Consumer)",
            "multiplier": 1.25,
            "description": "High frequency, small basket consumer orders with weekend acceleration."
        },
        "wholesale_b2b": {
            "name": "Wholesale & Bulk B2B Buyers",
            "multiplier": 2.20,
            "description": "Lumpy bulk order quantities triggering rapid single-day batch depletion."
        },
        "enterprise_contract": {
            "name": "Enterprise & Institutional Contracts",
            "multiplier": 0.85,
            "description": "Stable, scheduled contractual deliveries with strict safety SLA requirements."
        },
        "surge_promo": {
            "name": "Peak Promotional & Surge Demand",
            "multiplier": 3.50,
            "description": "Maximum flash-sale velocity and holiday seasonal spike consumption."
        }
    }

    selected_segment = segment_profiles.get(consumer_segment, segment_profiles["all"])
    multiplier = selected_segment["multiplier"]

    now = datetime.now(timezone.utc)
    t_1d = now - timedelta(days=1)
    t_7d = now - timedelta(days=7)
    t_30d = now - timedelta(days=30)

    # 1. Fetch real-time sales velocity from SalesOrderItem & SalesOrder
    sales_stmt = (
        select(
            SalesOrderItem.product_id,
            func.coalesce(func.sum(case((SalesOrderItem.created_at >= t_1d, SalesOrderItem.quantity), else_=0)), 0).label("sales_today"),
            func.coalesce(func.sum(case((SalesOrderItem.created_at >= t_7d, SalesOrderItem.quantity), else_=0)), 0).label("sales_7d"),
            func.coalesce(func.sum(case((SalesOrderItem.created_at >= t_30d, SalesOrderItem.quantity), else_=0)), 0).label("sales_30d")
        )
        .join(SalesOrder, SalesOrderItem.order_id == SalesOrder.id)
        .where(SalesOrder.order_status == "COMPLETED")
    )
    if branch_id:
        sales_stmt = sales_stmt.where(SalesOrder.branch_id == branch_id)
    sales_stmt = sales_stmt.group_by(SalesOrderItem.product_id)
    sales_res = await db.execute(sales_stmt)
    sales_map = {row.product_id: row for row in sales_res.all()}

    # 2. Also check stock_movements SALE_OUT in case movements were logged directly
    sm_stmt = (
        select(
            StockMovement.product_id,
            func.coalesce(func.sum(case((StockMovement.created_at >= t_1d, StockMovement.quantity), else_=0)), 0).label("sm_today"),
            func.coalesce(func.sum(case((StockMovement.created_at >= t_7d, StockMovement.quantity), else_=0)), 0).label("sm_7d"),
            func.coalesce(func.sum(case((StockMovement.created_at >= t_30d, StockMovement.quantity), else_=0)), 0).label("sm_30d")
        )
        .where(StockMovement.movement_type == "SALE_OUT")
        .group_by(StockMovement.product_id)
    )
    sm_res = await db.execute(sm_stmt)
    sm_map = {row.product_id: row for row in sm_res.all()}

    # 3. Load active products
    stmt = select(Product).options(selectinload(Product.category)).order_by(Product.current_stock.asc())
    result = await db.execute(stmt)
    products = result.scalars().all()

    predictions = []
    critical_count = 0
    urgent_count = 0
    total_reorder_recommended_units = 0

    for p in products:
        p_sales = sales_map.get(p.id)
        p_sm = sm_map.get(p.id)

        sales_today = int(max(p_sales.sales_today if p_sales else 0, p_sm.sm_today if p_sm else 0))
        sales_7d = int(max(p_sales.sales_7d if p_sales else 0, p_sm.sm_7d if p_sm else 0))
        sales_30d = int(max(p_sales.sales_30d if p_sales else 0, p_sm.sm_30d if p_sm else 0))

        avg_daily_7d = round(sales_7d / 7.0, 2)
        avg_daily_30d = round(sales_30d / 30.0, 2)

        # Dynamic Daily Sales velocity formula
        if sales_today > 0 or sales_7d > 0 or sales_30d > 0:
            has_live_sales = True
            calculation_basis = "Dynamic Daily Sales Velocity (Live POS & B2B Orders)"

            if sales_today > 0:
                # Any sales today immediately increase today's burn pace
                effective_daily_sales = (0.45 * avg_daily_7d) + (0.25 * avg_daily_30d) + (0.30 * sales_today)
            elif sales_7d > 0:
                effective_daily_sales = (0.75 * avg_daily_7d) + (0.25 * avg_daily_30d)
            else:
                effective_daily_sales = avg_daily_30d

            # Sales trend indicator
            if avg_daily_30d > 0 and avg_daily_7d >= 1.25 * avg_daily_30d:
                sales_trend = "ACCELERATING"
            elif avg_daily_30d > 0 and avg_daily_7d <= 0.75 * avg_daily_30d:
                sales_trend = "DECELERATING"
            else:
                sales_trend = "STEADY"
        else:
            has_live_sales = False
            calculation_basis = "Catalog Baseline Turnover (Awaiting First Store Sales)"
            effective_daily_sales = max(0.5, float(p.reorder_level or 10) / 14.0)
            sales_trend = "NO_RECENT_SALES"

        daily_burn = round(max(0.1, effective_daily_sales) * multiplier, 2)
        stock = p.current_stock

        if stock <= 0:
            days_left = 0.0
            urgency = "OUT_OF_STOCK"
            stockout_risk = 100
        else:
            days_left = round(stock / daily_burn, 1)
            if days_left <= 3.0:
                urgency = "CRITICAL"
                stockout_risk = 95
            elif days_left <= 7.0:
                urgency = "URGENT"
                stockout_risk = 75
            elif days_left <= 14.0:
                urgency = "MODERATE"
                stockout_risk = 45
            elif days_left <= 35.0:
                urgency = "SAFE"
                stockout_risk = 15
            else:
                urgency = "OVERSTOCKED"
                stockout_risk = 5

        exhaust_date = (now + timedelta(days=days_left)).strftime("%b %d, %Y") if days_left > 0 else "Immediate (Stockout)"
        reorder_qty = max(10, int((daily_burn * 30) - max(0, stock)))

        if urgency in ("OUT_OF_STOCK", "CRITICAL"):
            critical_count += 1
        elif urgency == "URGENT":
            urgent_count += 1

        total_reorder_recommended_units += reorder_qty

        predictions.append({
            "product_id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category_name": p.category.name if p.category else "General",
            "unit_of_measure": p.unit_of_measure,
            "current_stock": stock,
            "reorder_level": p.reorder_level,
            "daily_burn_rate": daily_burn,
            "days_until_exhaustion": days_left,
            "projected_exhaustion_date": exhaust_date,
            "urgency": urgency,
            "stockout_risk_percent": stockout_risk,
            "recommended_reorder_qty": reorder_qty,
            "estimated_reorder_cost": round(reorder_qty * float(p.cost_price or 0), 2),
            "sales_today": sales_today,
            "sales_last_7d": sales_7d,
            "avg_daily_sales_7d": avg_daily_7d,
            "sales_last_30d": sales_30d,
            "avg_daily_sales_30d": avg_daily_30d,
            "sales_trend": sales_trend,
            "has_live_sales": has_live_sales,
            "calculation_basis": calculation_basis
        })

    # Sort so most critical (fewest days remaining) appear first
    predictions.sort(key=lambda x: x["days_until_exhaustion"])

    avg_days = round(sum(p["days_until_exhaustion"] for p in predictions) / max(1, len(predictions)), 1)

    return {
        "consumer_segment": consumer_segment,
        "consumer_segment_name": selected_segment["name"],
        "consumer_segment_description": selected_segment["description"],
        "consumer_segment_multiplier": multiplier,
        "branch_id": branch_id,
        "prediction_engine": "Real-Time Sales-Driven Adaptive Velocity Engine",
        "available_segments": [
            {"id": k, "name": v["name"], "description": v["description"], "multiplier": v["multiplier"]}
            for k, v in segment_profiles.items()
        ],
        "summary": {
            "total_skus_analyzed": len(predictions),
            "critical_stockouts_count": critical_count,
            "urgent_reorders_count": urgent_count,
            "average_days_inventory_remaining": avg_days,
            "total_recommended_replenishment_units": total_reorder_recommended_units,
            "live_sales_active_skus": sum(1 for p in predictions if p["has_live_sales"])
        },
        "predictions": predictions
    }


@router.post("/stock-exhaustion-predictions/record-daily-sale")
async def record_daily_sale_and_update_prediction(
    payload: RecordDailySaleRequest,
    current_user: User = Depends(require_permission("sales.create")),
    db: AsyncSession = Depends(get_db)
):
    """
    Records an immediate sale transaction for a product and recalculates
    the updated stock exhaustion prediction and shift in exhaustion date.
    """
    prod_res = await db.execute(select(Product).where(Product.id == payload.product_id))
    product = prod_res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.current_stock < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for '{product.name}'. In stock: {product.current_stock}, requested: {payload.quantity}"
        )

    # 1. Fetch walk-in or default customer
    cust_res = await db.execute(select(Customer).limit(1))
    customer = cust_res.scalar_one_or_none()
    customer_id = customer.id if customer else None

    # 2. Record official SalesOrder via service
    order_in = SalesOrderCreate(
        customer_id=customer_id,
        branch_id=payload.branch_id,
        payment_method="CASH",
        discount_amount=Decimal("0.00"),
        notes=payload.notes,
        items=[
            SalesOrderItemIn(
                product_id=product.id,
                quantity=payload.quantity
            )
        ]
    )
    sales_order = await create_sales_order(
        db=db,
        order_in=order_in,
        cashier_user_id=current_user.id,
        organization_id=current_user.organization_id
    )

    # Audit log
    await record_audit_log(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        action="RECORD_DAILY_SALE",
        entity_name="sales_orders",
        entity_id=str(sales_order.id),
        details=f"Recorded sale of {payload.quantity} units of {product.name} ({product.sku}). Stock updated from {product.current_stock + payload.quantity} to {product.current_stock}."
    )

    # 3. Calculate new exhaustion prediction for this product
    now = datetime.now(timezone.utc)
    t_1d = now - timedelta(days=1)
    t_7d = now - timedelta(days=7)
    t_30d = now - timedelta(days=30)

    sales_stmt = (
        select(
            func.coalesce(func.sum(case((SalesOrderItem.created_at >= t_1d, SalesOrderItem.quantity), else_=0)), 0).label("sales_today"),
            func.coalesce(func.sum(case((SalesOrderItem.created_at >= t_7d, SalesOrderItem.quantity), else_=0)), 0).label("sales_7d"),
            func.coalesce(func.sum(case((SalesOrderItem.created_at >= t_30d, SalesOrderItem.quantity), else_=0)), 0).label("sales_30d")
        )
        .join(SalesOrder, SalesOrderItem.order_id == SalesOrder.id)
        .where(SalesOrder.order_status == "COMPLETED", SalesOrderItem.product_id == product.id)
    )
    res = await db.execute(sales_stmt)
    s_row = res.one_or_none()
    sales_today = s_row.sales_today if s_row else payload.quantity
    sales_7d = s_row.sales_7d if s_row else payload.quantity
    sales_30d = s_row.sales_30d if s_row else payload.quantity

    avg_7d = sales_7d / 7.0
    avg_30d = sales_30d / 30.0
    daily_burn = round((0.45 * avg_7d) + (0.25 * avg_30d) + (0.30 * sales_today), 2)
    daily_burn = max(0.1, daily_burn)

    new_stock = product.current_stock
    days_left = round(new_stock / daily_burn, 1) if new_stock > 0 else 0.0
    exhaust_date = (now + timedelta(days=days_left)).strftime("%b %d, %Y") if days_left > 0 else "Immediate (Stockout)"

    return {
        "success": True,
        "invoice_number": sales_order.invoice_number,
        "product_id": product.id,
        "product_name": product.name,
        "sku": product.sku,
        "quantity_sold": payload.quantity,
        "remaining_stock": new_stock,
        "sales_today": sales_today,
        "updated_daily_burn_rate": daily_burn,
        "updated_days_until_exhaustion": days_left,
        "updated_projected_exhaustion_date": exhaust_date,
        "message": f"Sale of {payload.quantity}x {product.name} recorded successfully. Prediction updated immediately based on today's sales."
    }

