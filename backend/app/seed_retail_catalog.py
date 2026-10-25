import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models import ProductCategory, Product, Organization, Branch

RETAIL_CATEGORIES = [
    {"name": "Clothing & Apparel", "code": "CAT-CLOTH", "description": "Shirts, jeans, t-shirts, ethnic wear and trousers"},
    {"name": "Sports & Fitness", "code": "CAT-SPORTS", "description": "Cricket, football, running shoes, rackets and gym equipment"},
    {"name": "Footwear & Accessories", "code": "CAT-FOOT", "description": "Sports shoes, casual footwear, belts and socks"},
]

RETAIL_PRODUCTS = [
    {
        "name": "Cotton Casual Shirt (Navy Blue - Size L)",
        "sku": "CLO-SHT-NVY-L",
        "barcode": "890554400101",
        "category_code": "CAT-CLOTH",
        "unit_of_measure": "pcs",
        "selling_price": Decimal("899.00"),
        "cost_price": Decimal("520.00"),
        "reorder_level": 10,
        "current_stock": 42
    },
    {
        "name": "Slim-Fit Denim Jeans (Indigo - Size 32)",
        "sku": "CLO-JNS-IND-32",
        "barcode": "890554400102",
        "category_code": "CAT-CLOTH",
        "unit_of_measure": "pcs",
        "selling_price": Decimal("1499.00"),
        "cost_price": Decimal("900.00"),
        "reorder_level": 12,
        "current_stock": 28
    },
    {
        "name": "Dry-Fit Sports T-Shirt (Black - Size M)",
        "sku": "CLO-TSH-BLK-M",
        "barcode": "890554400103",
        "category_code": "CAT-CLOTH",
        "unit_of_measure": "pcs",
        "selling_price": Decimal("499.00"),
        "cost_price": Decimal("280.00"),
        "reorder_level": 15,
        "current_stock": 65
    },
    {
        "name": "Cotton Ethnic Kurti (Floral - Size M)",
        "sku": "CLO-KUR-ETH-M",
        "barcode": "890554400104",
        "category_code": "CAT-CLOTH",
        "unit_of_measure": "pcs",
        "selling_price": Decimal("799.00"),
        "cost_price": Decimal("450.00"),
        "reorder_level": 10,
        "current_stock": 30
    },
    {
        "name": "Pro Match Football (Size 5 FIFA Quality)",
        "sku": "SPT-FTB-SZ5",
        "barcode": "890554400201",
        "category_code": "CAT-SPORTS",
        "unit_of_measure": "unit",
        "selling_price": Decimal("950.00"),
        "cost_price": Decimal("600.00"),
        "reorder_level": 8,
        "current_stock": 18
    },
    {
        "name": "English Willow Cricket Bat (Pro Grade)",
        "sku": "SPT-CBT-ENG",
        "barcode": "890554400202",
        "category_code": "CAT-SPORTS",
        "unit_of_measure": "unit",
        "selling_price": Decimal("2850.00"),
        "cost_price": Decimal("1800.00"),
        "reorder_level": 5,
        "current_stock": 9
    },
    {
        "name": "Lightweight Running Shoes (Size 9 UK)",
        "sku": "SPT-SHO-RN-09",
        "barcode": "890554400203",
        "category_code": "CAT-FOOT",
        "unit_of_measure": "pair",
        "selling_price": Decimal("2199.00"),
        "cost_price": Decimal("1350.00"),
        "reorder_level": 8,
        "current_stock": 22
    },
    {
        "name": "Badminton Carbon Racket (G4 Grip)",
        "sku": "SPT-BAD-CRB",
        "barcode": "890554400204",
        "category_code": "CAT-SPORTS",
        "unit_of_measure": "unit",
        "selling_price": Decimal("1250.00"),
        "cost_price": Decimal("750.00"),
        "reorder_level": 10,
        "current_stock": 25
    },
    {
        "name": "Gym Resistance Bands Set (5 Heavy Levels)",
        "sku": "SPT-GYM-RBD",
        "barcode": "890554400205",
        "category_code": "CAT-SPORTS",
        "unit_of_measure": "set",
        "selling_price": Decimal("599.00"),
        "cost_price": Decimal("320.00"),
        "reorder_level": 15,
        "current_stock": 45
    }
]

async def seed_retail():
    async with AsyncSessionLocal() as db:
        # Get organization id
        org = (await db.execute(select(Organization).limit(1))).scalar_one_or_none()
        org_id = org.id if org else 1

        # Check and add categories
        cat_map = {}
        for c in RETAIL_CATEGORIES:
            res = await db.execute(select(ProductCategory).where(ProductCategory.code == c["code"]))
            cat_obj = res.scalar_one_or_none()
            if not cat_obj:
                cat_obj = ProductCategory(name=c["name"], code=c["code"], description=c["description"])
                db.add(cat_obj)
                await db.flush()
            cat_map[c["code"]] = cat_obj.id

        # Check and add products
        added_count = 0
        for p in RETAIL_PRODUCTS:
            res = await db.execute(select(Product).where(Product.sku == p["sku"]))
            if not res.scalar_one_or_none():
                prod = Product(
                    organization_id=org_id,
                    name=p["name"],
                    sku=p["sku"],
                    barcode=p["barcode"],
                    category_id=cat_map.get(p["category_code"]),
                    unit_of_measure=p["unit_of_measure"],
                    selling_price=p["selling_price"],
                    cost_price=p["cost_price"],
                    reorder_level=p["reorder_level"],
                    current_stock=p["current_stock"]
                )
                db.add(prod)
                added_count += 1
        
        await db.commit()
        print(f"Successfully seeded {added_count} retail clothing & sports items.")

if __name__ == "__main__":
    asyncio.run(seed_retail())
