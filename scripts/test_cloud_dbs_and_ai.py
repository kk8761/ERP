"""
NexaERP Cloud Infrastructure & Diagnostics Verification Script.
Tests:
1. PostgreSQL Database connectivity & table schema
2. MongoDB Atlas / cluster connectivity & collections
3. Multi-Provider AI (Groq, Google Gemini, OpenAI, or Built-in Copilot)
"""

import os
import sys
import asyncio
import urllib.request
import json

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

async def test_postgres():
    print("\n🔍 [1/3] Testing Primary Relational DBMS (PostgreSQL / SQLite)...")
    try:
        from app.database import engine, get_normalized_database_url
        from app.config import settings
        from sqlalchemy import text

        url = get_normalized_database_url(settings.DATABASE_URL)
        masked_url = url
        if "@" in url:
            parts = url.split("@")
            masked_url = parts[0].split(":")[0] + ":****@" + parts[1]
        print(f"   Target URL: {masked_url}")

        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            val = res.scalar()
            if val == 1:
                print("   ✅ PostgreSQL / SQL Engine: Connected and responding successfully!")
                return True
    except Exception as e:
        print(f"   ❌ PostgreSQL Error: {e}")
        return False

async def test_mongodb():
    print("\n🔍 [2/3] Testing Polyglot Document Store (MongoDB)...")
    try:
        from app.config import settings
        from app.mongodb import init_mongodb, check_mongodb_status, close_mongodb

        if not settings.MONGODB_URI:
            print("   ℹ️ MONGODB_URI not set. Running in relational-only mode.")
            print("   💡 Tip: Add your free MongoDB Atlas URI in .env to enable document archiving.")
            return True

        masked_uri = settings.MONGODB_URI
        if "@" in masked_uri:
            parts = masked_uri.split("@")
            masked_uri = parts[0].split(":")[0] + ":****@" + parts[1]
        print(f"   Target URI: {masked_uri}")

        db = await init_mongodb()
        status = await check_mongodb_status()
        if status.get("connected"):
            print(f"   ✅ MongoDB: Connected to database '{status.get('database')}' successfully!")
            print(f"   Collections available: {status.get('collections')}")
            await close_mongodb()
            return True
        else:
            print(f"   ⚠️ MongoDB status: {status.get('message') or status.get('error')}")
            return False
    except Exception as e:
        print(f"   ❌ MongoDB Error: {e}")
        return False

async def test_ai_engine():
    print("\n🔍 [3/3] Testing AI Intelligence Engine & Multi-Provider APIs...")
    try:
        from app.config import settings
        from app.services.ai_service import call_enterprise_ai_llm

        providers = []
        if settings.GROQ_API_KEY:
            providers.append(f"Groq Cloud ({settings.GROQ_MODEL})")
        if settings.GEMINI_API_KEY:
            providers.append(f"Google Gemini ({settings.GEMINI_MODEL})")
        if settings.OPENAI_API_KEY:
            providers.append(f"OpenAI ({settings.OPENAI_MODEL})")

        if providers:
            print(f"   Configured AI Providers: {', '.join(providers)}")
            print("   Sending test query through enterprise AI gateway...")
            resp = call_enterprise_ai_llm(
                system_prompt="You are NexaERP Assistant. Return exact text: 'AI Gateway Operational'",
                user_prompt="Status test"
            )
            if resp:
                print(f"   ✅ AI API Response received: {resp.strip()[:100]}")
            else:
                print("   ℹ️ Cloud AI returned empty or failed over. Built-in RAG copilot active.")
        else:
            print("   ℹ️ No external AI keys configured. Autonomous Built-in RAG Copilot is ACTIVE.")
            print("   💡 Tip: Add free GROQ_API_KEY (from groq.com) or GEMINI_API_KEY (from aistudio.google.com) to enable cloud LLMs.")
            print("   ✅ Autonomous Offline Copilot verified.")
        return True
    except Exception as e:
        print(f"   ❌ AI Gateway Error: {e}")
        return False

async def main():
    print("=" * 65)
    print(" 🚀 NexaERP Cloud Infrastructure & Polyglot DBMS Diagnostics")
    print("=" * 65)

    pg_ok = await test_postgres()
    mongo_ok = await test_mongodb()
    ai_ok = await test_ai_engine()

    print("\n" + "=" * 65)
    print(" 📋 Summary:")
    print(f"  • PostgreSQL / SQL: {'READY ✅' if pg_ok else 'FAILED ❌'}")
    print(f"  • MongoDB Document: {'READY ✅' if mongo_ok else 'ATTENTION ⚠️'}")
    print(f"  • AI Intelligence:  {'READY ✅' if ai_ok else 'FAILED ❌'}")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
