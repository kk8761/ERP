import os
import uvicorn

# Strictly configure Retail Storefront Database
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./nexaerp_retail.db"
os.environ["PORT"] = "8001"
os.environ["BOOTSTRAP_ADMIN_EMAIL"] = "shopadmin@nexaerp.internal"
os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = "ShopAdmin@12345"

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=False)
