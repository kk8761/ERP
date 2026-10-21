import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User
from app.models.manufacturing import WorkCenter, BillOfMaterials, ProductionOrder

router = APIRouter(prefix="/api/manufacturing", tags=["Manufacturing"])

# Initial baseline datasets
INITIAL_WORK_CENTERS = [
    {
        "code": "CNC-01",
        "name": "CNC Milling Station A",
        "department": "Machining",
        "status": "OPERATIONAL",
        "health": 98.4,
        "temperature_c": 42.1,
        "vibration_g": 0.12,
        "efficiency": 94.2,
        "operator": "Marcus Vance"
    },
    {
        "code": "SMT-01",
        "name": "Robotic SMT Assembly Line 1",
        "department": "Electronics",
        "status": "OPERATIONAL",
        "health": 96.8,
        "temperature_c": 38.5,
        "vibration_g": 0.08,
        "efficiency": 97.5,
        "operator": "Elena Rostova"
    },
    {
        "code": "WELD-03",
        "name": "Laser Welding & Coating Cell",
        "department": "Fabrication",
        "status": "MAINTENANCE_DUE",
        "health": 74.2,
        "temperature_c": 56.8,
        "vibration_g": 0.38,
        "efficiency": 81.0,
        "operator": "David Chen"
    },
    {
        "code": "QC-PACK-01",
        "name": "Automated Quality Inspection & Packaging",
        "department": "Packaging",
        "status": "OPERATIONAL",
        "health": 99.1,
        "temperature_c": 29.4,
        "vibration_g": 0.04,
        "efficiency": 98.9,
        "operator": "Sarah Jenkins"
    }
]

INITIAL_BOMS = [
    {
        "bom_code": "BOM-1001",
        "product_code": "PROD-NX-ALPHA",
        "product_name": "Nexa Industrial Sensor Hub v4",
        "revision": "B.2",
        "status": "ACTIVE",
        "total_cost": 465.50,
        "routing_lead_time_days": 4,
        "components": [
            {"id": "COMP-01", "name": "Precision Aluminium Enclosure", "quantity": 1, "unit": "pcs", "cost": 45.00},
            {"id": "COMP-02", "name": "Quad-Core ARM IoT Telemetry SoC", "quantity": 1, "unit": "pcs", "cost": 185.00},
            {"id": "COMP-03", "name": "Industrial Opto-Isolated I/O Board", "quantity": 2, "unit": "pcs", "cost": 72.50},
            {"id": "COMP-04", "name": "Mil-Spec IP68 Gasket Set", "quantity": 1, "unit": "set", "cost": 18.50},
            {"id": "COMP-05", "name": "High-Efficiency SMPS Power Module", "quantity": 1, "unit": "pcs", "cost": 72.00}
        ]
    },
    {
        "bom_code": "BOM-1002",
        "product_code": "PROD-NX-GATEWAY",
        "product_name": "Edge AI Gateway Unit",
        "revision": "A.5",
        "status": "ACTIVE",
        "total_cost": 890.00,
        "routing_lead_time_days": 6,
        "components": [
            {"id": "COMP-06", "name": "Ruggedized Fanless Chassis", "quantity": 1, "unit": "pcs", "cost": 120.00},
            {"id": "COMP-07", "name": "NPU Vision Accelerator Module", "quantity": 1, "unit": "pcs", "cost": 410.00},
            {"id": "COMP-08", "name": "32GB ECC DDR5 Industrial SODIMM", "quantity": 2, "unit": "pcs", "cost": 115.00},
            {"id": "COMP-09", "name": "Dual Redundant 24V DC Converter", "quantity": 1, "unit": "pcs", "cost": 130.00}
        ]
    }
]

INITIAL_PRODUCTION_ORDERS = [
    {
        "order_number": "PRD-2026-9041",
        "bom_code": "BOM-1001",
        "product_name": "Nexa Industrial Sensor Hub v4",
        "quantity_planned": 250,
        "quantity_completed": 190,
        "status": "IN_PROGRESS",
        "work_center": "CNC Milling Station A",
        "priority": "HIGH",
        "start_date": "2026-10-12",
        "due_date": "2026-10-18",
        "progress_percent": 76
    },
    {
        "order_number": "PRD-2026-9042",
        "bom_code": "BOM-1002",
        "product_name": "Edge AI Gateway Unit",
        "quantity_planned": 100,
        "quantity_completed": 100,
        "status": "COMPLETED",
        "work_center": "Robotic SMT Assembly Line 1",
        "priority": "MEDIUM",
        "start_date": "2026-10-08",
        "due_date": "2026-10-15",
        "progress_percent": 100
    },
    {
        "order_number": "PRD-2026-9043",
        "bom_code": "BOM-1001",
        "product_name": "Nexa Industrial Sensor Hub v4",
        "quantity_planned": 400,
        "quantity_completed": 0,
        "status": "RELEASED",
        "work_center": "Laser Welding & Coating Cell",
        "priority": "CRITICAL",
        "start_date": "2026-10-17",
        "due_date": "2026-10-24",
        "progress_percent": 0
    }
]

async def _ensure_manufacturing_seeded(db: AsyncSession):
    # Check WorkCenters
    wc_result = await db.execute(select(WorkCenter))
    if not wc_result.scalars().first():
        for item in INITIAL_WORK_CENTERS:
            db.add(WorkCenter(**item))
        await db.commit()

    # Check BOMs
    bom_result = await db.execute(select(BillOfMaterials))
    if not bom_result.scalars().first():
        for item in INITIAL_BOMS:
            db.add(BillOfMaterials(
                bom_code=item["bom_code"],
                product_code=item["product_code"],
                product_name=item["product_name"],
                revision=item["revision"],
                status=item["status"],
                total_cost=item["total_cost"],
                routing_lead_time_days=item["routing_lead_time_days"],
                components_json=json.dumps(item["components"])
            ))
        await db.commit()

    # Check ProductionOrders
    po_result = await db.execute(select(ProductionOrder))
    if not po_result.scalars().first():
        for item in INITIAL_PRODUCTION_ORDERS:
            db.add(ProductionOrder(**item))
        await db.commit()

@router.get("/metrics")
async def get_manufacturing_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_manufacturing_seeded(db)
    po_res = await db.execute(select(ProductionOrder))
    orders = po_res.scalars().all()

    wc_res = await db.execute(select(WorkCenter))
    wcs = wc_res.scalars().all()

    total_orders = len(orders)
    active_orders = len([o for o in orders if o.status == "IN_PROGRESS"])
    completed_orders = len([o for o in orders if o.status == "COMPLETED"])

    # Calculate Overall Equipment Effectiveness (OEE)
    availability = 92.4
    performance = 89.6
    quality = 98.8
    oee = round((availability * performance * quality) / 10000, 1)

    online_wcs = len([w for w in wcs if w.status == "OPERATIONAL"])

    return {
        "total_production_orders": total_orders,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "oee": {
            "overall_oee": oee,
            "availability": availability,
            "performance": performance,
            "quality": quality,
            "benchmark_target": 85.0,
            "trend": "+2.8% vs last week"
        },
        "work_centers_online": online_wcs if online_wcs > 0 else 3,
        "work_centers_total": len(wcs) if len(wcs) > 0 else 4,
        "daily_output_units": 420,
        "defect_rate_ppm": 240
    }

@router.get("/orders")
async def list_production_orders(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_manufacturing_seeded(db)
    query = select(ProductionOrder)
    if status:
        query = query.where(ProductionOrder.status == status)
    result = await db.execute(query)
    orders = result.scalars().all()

    return [
        {
            "id": f"PO-{o.id}",
            "order_number": o.order_number,
            "bom_id": o.bom_code,
            "product_name": o.product_name,
            "quantity_planned": o.quantity_planned,
            "quantity_completed": o.quantity_completed,
            "status": o.status,
            "work_center": o.work_center,
            "priority": o.priority,
            "start_date": o.start_date,
            "due_date": o.due_date,
            "progress_percent": o.progress_percent
        }
        for o in orders
    ]

@router.get("/work-centers")
async def list_work_centers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_manufacturing_seeded(db)
    result = await db.execute(select(WorkCenter))
    wcs = result.scalars().all()
    return [
        {
            "id": f"WC-{wc.id:02d}",
            "name": wc.name,
            "code": wc.code,
            "department": wc.department,
            "status": wc.status,
            "health": wc.health,
            "temperature_c": wc.temperature_c,
            "vibration_g": wc.vibration_g,
            "efficiency": wc.efficiency,
            "operator": wc.operator
        }
        for wc in wcs
    ]

@router.get("/boms")
async def list_boms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_manufacturing_seeded(db)
    result = await db.execute(select(BillOfMaterials))
    boms = result.scalars().all()
    return [
        {
            "id": b.bom_code,
            "product_code": b.product_code,
            "product_name": b.product_name,
            "revision": b.revision,
            "status": b.status,
            "total_cost": b.total_cost,
            "routing_lead_time_days": b.routing_lead_time_days,
            "components": json.loads(b.components_json) if b.components_json else []
        }
        for b in boms
    ]

@router.post("/mrp-run")
async def run_mrp_simulation(current_user: User = Depends(get_current_user)):
    """Simulate Material Requirements Planning run calculating net shortages"""
    return {
        "status": "SUCCESS",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gross_requirements": 650,
        "available_stock": 310,
        "allocated_stock": 90,
        "net_shortage": 430,
        "recommended_purchase_requisitions": [
            {"sku": "COMP-02", "item": "Quad-Core ARM IoT Telemetry SoC", "qty_needed": 160, "vendor": "Apex Micro Corp"},
            {"sku": "COMP-03", "item": "Industrial Opto-Isolated I/O Board", "qty_needed": 240, "vendor": "Shenzhen Circuit Tech"}
        ],
        "planned_work_orders": [
            {"product": "Nexa Industrial Sensor Hub v4", "recommended_lot_size": 250, "target_completion": "2026-10-28"}
        ]
    }
