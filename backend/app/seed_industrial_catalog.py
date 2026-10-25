import asyncio
import logging
from decimal import Decimal
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.inventory import ProductCategory, Product
from app.models.org import Organization

logger = logging.getLogger(__name__)

INDUSTRIAL_CATEGORIES = [
    {
        "name": "Raw Materials & Metallurgy",
        "code": "CAT-IND-RAW",
        "description": "Industrial grade steel coils, aluminum billets, alloys, and structural metal stocks"
    },
    {
        "name": "Industrial Machinery & Tooling",
        "code": "CAT-IND-MACH",
        "description": "CNC milling centers, hydraulic stamping presses, and robotic manufacturing gantries"
    },
    {
        "name": "Electrical & Plant Automation",
        "code": "CAT-IND-ELEC",
        "description": "3-phase industrial induction motors, PLCs, variable frequency drives, and switchgears"
    },
    {
        "name": "Sensors & Instrumentation",
        "code": "CAT-IND-IOT",
        "description": "Factory IoT vibration monitors, pyrometers, flowmeters, and telemetry transducers"
    },
    {
        "name": "Industrial Consumables & MRO",
        "code": "CAT-IND-MRO",
        "description": "Heavy-duty hydraulic lubricants, synthetic gear oils, cutting fluids, and conveyor belting"
    }
]

INDUSTRIAL_PRODUCTS = [
    {
        "name": "Hot-Rolled Carbon Steel Coil (2.5 Tons, 1.5mm×1250mm)",
        "sku": "IND-STL-COIL-01",
        "barcode": "890987654001",
        "category_code": "CAT-IND-RAW",
        "unit_of_measure": "unit",
        "selling_price": Decimal("185000.00"),
        "cost_price": Decimal("155000.00"),
        "reorder_level": 4,
        "current_stock": 18
    },
    {
        "name": "Grade-6061 Aerospace Aluminum Billet (500kg Extrusion Stock)",
        "sku": "IND-ALU-BLT-6061",
        "barcode": "890987654002",
        "category_code": "CAT-IND-RAW",
        "unit_of_measure": "unit",
        "selling_price": Decimal("95000.00"),
        "cost_price": Decimal("78000.00"),
        "reorder_level": 5,
        "current_stock": 24
    },
    {
        "name": "Grade 5 Titanium Alloy Plate (10mm × 1000mm × 2000mm)",
        "sku": "IND-TIT-PLT-GR5",
        "barcode": "890987654003",
        "category_code": "CAT-IND-RAW",
        "unit_of_measure": "pcs",
        "selling_price": Decimal("240000.00"),
        "cost_price": Decimal("198000.00"),
        "reorder_level": 2,
        "current_stock": 8
    },
    {
        "name": "5-Axis High-Precision CNC Milling Machine Center (12,000 RPM)",
        "sku": "IND-MCH-CNC-5AX",
        "barcode": "890987654004",
        "category_code": "CAT-IND-MACH",
        "unit_of_measure": "unit",
        "selling_price": Decimal("1850000.00"),
        "cost_price": Decimal("1520000.00"),
        "reorder_level": 1,
        "current_stock": 3
    },
    {
        "name": "50-Ton Industrial Hydraulic Stamping Press (Double-Acting)",
        "sku": "IND-MCH-HYD-50T",
        "barcode": "890987654005",
        "category_code": "CAT-IND-MACH",
        "unit_of_measure": "unit",
        "selling_price": Decimal("720000.00"),
        "cost_price": Decimal("590000.00"),
        "reorder_level": 2,
        "current_stock": 5
    },
    {
        "name": "6-Axis Articulated Assembly Robotic Arm (20kg Payload)",
        "sku": "IND-MCH-ROB-6AX",
        "barcode": "890987654006",
        "category_code": "CAT-IND-MACH",
        "unit_of_measure": "unit",
        "selling_price": Decimal("980000.00"),
        "cost_price": Decimal("810000.00"),
        "reorder_level": 2,
        "current_stock": 6
    },
    {
        "name": "15kW Heavy-Duty 3-Phase Induction Motor (415V, 1450 RPM)",
        "sku": "IND-ELE-MOT-15KW",
        "barcode": "890987654007",
        "category_code": "CAT-IND-ELEC",
        "unit_of_measure": "unit",
        "selling_price": Decimal("42500.00"),
        "cost_price": Decimal("33000.00"),
        "reorder_level": 8,
        "current_stock": 32
    },
    {
        "name": "Modular Industrial PLC Automation Controller (24 I/O Digital/Analog)",
        "sku": "IND-ELE-PLC-MOD",
        "barcode": "890987654008",
        "category_code": "CAT-IND-ELEC",
        "unit_of_measure": "unit",
        "selling_price": Decimal("68000.00"),
        "cost_price": Decimal("52000.00"),
        "reorder_level": 6,
        "current_stock": 25
    },
    {
        "name": "Industrial IoT Wireless Triaxial Vibration & Temp Sensor Pod",
        "sku": "IND-IOT-VIB-01",
        "barcode": "890987654009",
        "category_code": "CAT-IND-IOT",
        "unit_of_measure": "pcs",
        "selling_price": Decimal("14500.00"),
        "cost_price": Decimal("10200.00"),
        "reorder_level": 15,
        "current_stock": 60
    },
    {
        "name": "High-Temp Optical Infrared Pyrometer (0 to 1800°C Sensing)",
        "sku": "IND-IOT-PYR-1800",
        "barcode": "890987654010",
        "category_code": "CAT-IND-IOT",
        "unit_of_measure": "pcs",
        "selling_price": Decimal("38000.00"),
        "cost_price": Decimal("29500.00"),
        "reorder_level": 4,
        "current_stock": 14
    },
    {
        "name": "ISO VG 46 Anti-Wear Industrial Hydraulic Fluid (200L Steel Drum)",
        "sku": "IND-MRO-HYD-200L",
        "barcode": "890987654011",
        "category_code": "CAT-IND-MRO",
        "unit_of_measure": "unit",
        "selling_price": Decimal("28500.00"),
        "cost_price": Decimal("22000.00"),
        "reorder_level": 10,
        "current_stock": 45
    },
    {
        "name": "Synthetic Heavy-Duty Industrial Gear Lubricant (50L Canister)",
        "sku": "IND-MRO-SYN-50L",
        "barcode": "890987654012",
        "category_code": "CAT-IND-MRO",
        "unit_of_measure": "unit",
        "selling_price": Decimal("18000.00"),
        "cost_price": Decimal("14200.00"),
        "reorder_level": 8,
        "current_stock": 38
    }
]

async def seed_industrial():
    async with AsyncSessionLocal() as db:
        # Check org
        res_org = await db.execute(select(Organization).limit(1))
        org = res_org.scalar_one_or_none()
        org_id = org.id if org else 1

        cat_map = {}
        for c in INDUSTRIAL_CATEGORIES:
            res = await db.execute(select(ProductCategory).where(ProductCategory.code == c["code"]).limit(1))
            cat = res.scalar_one_or_none()
            if not cat:
                cat = ProductCategory(
                    name=c["name"],
                    code=c["code"],
                    description=c["description"]
                )
                db.add(cat)
                await db.flush()
                logger.info("Created Industrial Category: %s (%s)", c["name"], c["code"])
            cat_map[c["code"]] = cat.id

        inserted_count = 0
        for p in INDUSTRIAL_PRODUCTS:
            res_p = await db.execute(select(Product).where(Product.sku == p["sku"]).limit(1))
            prod = res_p.scalar_one_or_none()
            if not prod:
                cat_id = cat_map.get(p["category_code"])
                new_prod = Product(
                    organization_id=org_id,
                    category_id=cat_id,
                    name=p["name"],
                    sku=p["sku"],
                    barcode=p["barcode"],
                    unit_of_measure=p["unit_of_measure"],
                    selling_price=p["selling_price"],
                    cost_price=p["cost_price"],
                    reorder_level=p["reorder_level"],
                    current_stock=p["current_stock"],
                    is_active=True
                )
                db.add(new_prod)
                inserted_count += 1

        await db.commit()
        print(f"Successfully seeded {inserted_count} industrial & manufacturing items.")
        return inserted_count

if __name__ == "__main__":
    asyncio.run(seed_industrial())
