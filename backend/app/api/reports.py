import io
import csv
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import require_permission
from app.models.auth import User
from app.models.sales import SalesOrder
from app.models.inventory import Product
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/reports", tags=["Reports and Exports"])

@router.get("/sales/csv")
async def export_sales_csv(
    current_user: User = Depends(require_permission("reports.export")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SalesOrder).options(selectinload(SalesOrder.customer)).order_by(SalesOrder.created_at.desc())
    res = await db.execute(stmt)
    orders = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Invoice Number", "Customer", "Subtotal", "Discount", "Tax", "Total Amount", "Payment Method", "Status", "Date"])

    for o in orders:
        writer.writerow([
            o.invoice_number,
            o.customer.name if o.customer else "Walk-in Customer",
            float(o.subtotal),
            float(o.discount_amount),
            float(o.tax_amount),
            float(o.total_amount),
            o.payment_method,
            o.order_status,
            o.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    await record_audit_log(
        db, action="REPORT_EXPORTED", entity_name="SalesOrder",
        user_id=current_user.id, user_email=current_user.email,
        details={"report": "sales_csv", "records_count": len(orders)}
    )
    await db.commit()

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nexaerp_sales_report.csv"}
    )

@router.get("/inventory/csv")
async def export_inventory_csv(
    current_user: User = Depends(require_permission("reports.export")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).options(selectinload(Product.category)).order_by(Product.name.asc())
    res = await db.execute(stmt)
    products = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["SKU", "Product Name", "Barcode", "Category", "Unit", "Selling Price", "Cost Price", "Current Stock", "Reorder Level", "Valuation"])

    for p in products:
        valuation = float(p.cost_price or 0) * p.current_stock
        writer.writerow([
            p.sku,
            p.name,
            p.barcode or "",
            p.category.name if p.category else "",
            p.unit_of_measure,
            float(p.selling_price),
            float(p.cost_price),
            p.current_stock,
            p.reorder_level,
            valuation
        ])

    await record_audit_log(
        db, action="REPORT_EXPORTED", entity_name="Product",
        user_id=current_user.id, user_email=current_user.email,
        details={"report": "inventory_csv", "records_count": len(products)}
    )
    await db.commit()

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nexaerp_inventory_report.csv"}
    )
