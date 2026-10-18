from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.inventory import Product, ProductCategory, StockMovement
from app.schemas.inventory import (
    ProductCreate, ProductUpdate, ProductOut,
    CategoryCreate, CategoryOut, StockAdjustmentIn
)
from app.services.inventory_service import adjust_product_stock
from app.services.audit_service import record_audit_log

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
    current_user: User = Depends(require_permission("inventory.view")),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Predicts in how many days current stock will be exhausted,
    tailored across different consumer demand profiles.
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

    stmt = select(Product).options(selectinload(Product.category)).order_by(Product.current_stock.asc())
    result = await db.execute(stmt)
    products = result.scalars().all()

    now = datetime.now(timezone.utc)
    predictions = []
    critical_count = 0
    urgent_count = 0
    total_reorder_recommended_units = 0

    for p in products:
        # Base daily consumption rate derived from item reorder level and minimum turnover
        base_rate = max(0.5, float(p.reorder_level or 10) / 7.0)
        daily_burn = round(base_rate * multiplier, 2)

        stock = p.current_stock
        if stock <= 0:
            days_left = 0.0
            urgency = "OUT_OF_STOCK"
            stockout_risk = 100
        else:
            days_left = round(stock / daily_burn, 1)
            if days_left <= 4.0:
                urgency = "CRITICAL"
                stockout_risk = 95
            elif days_left <= 8.0:
                urgency = "URGENT"
                stockout_risk = 75
            elif days_left <= 15.0:
                urgency = "MODERATE"
                stockout_risk = 45
            elif days_left <= 45.0:
                urgency = "SAFE"
                stockout_risk = 15
            else:
                urgency = "OVERSTOCKED"
                stockout_risk = 5

        exhaust_date = (now + timedelta(days=days_left)).strftime("%b %d, %Y")
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
            "estimated_reorder_cost": round(reorder_qty * float(p.cost_price or 0), 2)
        })

    # Sort so most critical (fewest days remaining) appear first
    predictions.sort(key=lambda x: x["days_until_exhaustion"])

    avg_days = round(sum(p["days_until_exhaustion"] for p in predictions) / max(1, len(predictions)), 1)

    return {
        "consumer_segment": consumer_segment,
        "consumer_segment_name": selected_segment["name"],
        "consumer_segment_description": selected_segment["description"],
        "consumer_segment_multiplier": multiplier,
        "available_segments": [
            {"id": k, "name": v["name"], "description": v["description"], "multiplier": v["multiplier"]}
            for k, v in segment_profiles.items()
        ],
        "summary": {
            "total_skus_analyzed": len(predictions),
            "critical_stockouts_count": critical_count,
            "urgent_reorders_count": urgent_count,
            "average_days_inventory_remaining": avg_days,
            "total_recommended_replenishment_units": total_reorder_recommended_units
        },
        "predictions": predictions
    }
