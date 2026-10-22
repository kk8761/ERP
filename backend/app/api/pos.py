from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.inventory import Product
from app.schemas.inventory import ProductOut
from app.schemas.sales import SalesOrderCreate, SalesOrderOut
from app.services.sales_service import create_sales_order
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/pos", tags=["Point of Sale"])

@router.get("/barcode/{barcode}", response_model=ProductOut)
async def lookup_barcode(
    barcode: str,
    current_user: User = Depends(require_permission("sales.create")),
    db: AsyncSession = Depends(get_db)
):
    user_org_id = getattr(current_user, "organization_id", None)
    filter_clause = (Product.barcode == barcode) | (Product.sku == barcode)
    if user_org_id is not None:
        filter_clause = filter_clause & (Product.organization_id == user_org_id)

    stmt = (
        select(Product)
        .options(selectinload(Product.category))
        .where(filter_clause)
    )
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No product matches barcode or SKU '{barcode}'"
        )

    return ProductOut(
        id=product.id,
        name=product.name,
        sku=product.sku,
        barcode=product.barcode,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        unit_of_measure=product.unit_of_measure,
        selling_price=product.selling_price,
        cost_price=product.cost_price,
        tax_rate_percent=product.tax_rate_percent,
        reorder_level=product.reorder_level,
        current_stock=product.current_stock,
        image_url=product.image_url,
        is_active=product.is_active,
        status="In Stock" if product.current_stock > product.reorder_level else ("Out of Stock" if product.current_stock <= 0 else "Low Stock")
    )
