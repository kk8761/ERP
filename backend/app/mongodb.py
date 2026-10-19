"""
NexaERP MongoDB Polyglot Document Store Service.
Provides asynchronous document persistence using Motor (official async driver):
1. Email Documents & Attachments Archive (`email_documents`)
2. AI Conversations & RAG Telemetry (`ai_conversations`)
3. Enterprise Audit Events & Incident Logs (`audit_events`)
4. System Health & Connection Diagnostics
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("app.mongodb")

_mongo_client: Optional[AsyncIOMotorClient] = None
_mongo_db: Optional[AsyncIOMotorDatabase] = None

async def init_mongodb() -> Optional[AsyncIOMotorDatabase]:
    """
    Initializes connection to MongoDB cluster if MONGODB_URI is configured.
    Supports MongoDB Atlas (cloud.mongodb.com) and local/Docker MongoDB.
    Gracefully handles offline or unconfigured states without crashing.
    """
    global _mongo_client, _mongo_db

    if not settings.MONGODB_URI:
        logger.info("[MongoDB] MONGODB_URI not set. Running in relational-only mode (PostgreSQL / SQLite).")
        return None

    try:
        # Initialize Motor Async Client with resilient timeout
        _mongo_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        db_name = settings.MONGODB_DB_NAME or "nexaerp"
        _mongo_db = _mongo_client[db_name]

        # Verify cluster ping
        await _mongo_client.admin.command("ping")
        logger.info(f"[MongoDB] Successfully connected to cluster database: '{db_name}'")

        # Create recommended indexes in background
        await _create_indexes(_mongo_db)
        return _mongo_db

    except Exception as e:
        logger.warning(f"[MongoDB] Notice: Could not connect to MongoDB ({e}). Document archiving will proceed gracefully offline.")
        _mongo_client = None
        _mongo_db = None
        return None

async def close_mongodb():
    """Closes MongoDB client connection on application shutdown."""
    global _mongo_client, _mongo_db
    if _mongo_client:
        _mongo_client.close()
        logger.info("[MongoDB] Client connection closed.")
        _mongo_client = None
        _mongo_db = None

def get_mongodb_database() -> Optional[AsyncIOMotorDatabase]:
    """Returns the active MongoDB database instance, or None if offline."""
    return _mongo_db

async def check_mongodb_status() -> Dict[str, Any]:
    """Checks the health and status of MongoDB connection for /api/health and admin dashboards."""
    if not settings.MONGODB_URI:
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "MONGODB_URI environment variable not provided. System is using primary SQL DBMS."
        }

    if _mongo_client is None:
        return {
            "status": "disconnected",
            "connected": False,
            "message": "Connection attempt failed or pending initialization."
        }

    try:
        await _mongo_client.admin.command("ping")
        db = get_mongodb_database()
        collections = await db.list_collection_names() if db else []
        return {
            "status": "connected",
            "connected": True,
            "database": settings.MONGODB_DB_NAME,
            "collections": collections,
            "message": "MongoDB cluster is healthy and active."
        }
    except Exception as e:
        return {
            "status": "error",
            "connected": False,
            "error": str(e)
        }

async def _create_indexes(db: AsyncIOMotorDatabase):
    """Initializes indexes for fast document queries."""
    try:
        await db.email_documents.create_index([("document_reference", 1)])
        await db.email_documents.create_index([("recipient_email", 1)])
        await db.email_documents.create_index([("created_at", -1)])
        await db.ai_conversations.create_index([("user_id", 1)])
        await db.ai_conversations.create_index([("timestamp", -1)])
        await db.audit_events.create_index([("action", 1)])
        await db.audit_events.create_index([("timestamp", -1)])
    except Exception as e:
        logger.debug(f"[MongoDB] Index creation notice: {e}")

# Document Archiving Helpers

async def archive_email_document(email_payload: Dict[str, Any]) -> Optional[str]:
    """
    Archives a complete business email document (including MIME headers and attachments metadata)
    into the MongoDB `email_documents` collection.
    """
    db = get_mongodb_database()
    if db is None:
        return None

    try:
        doc = {
            **email_payload,
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "source": "NexaERP Enterprise Email Engine"
        }
        res = await db.email_documents.insert_one(doc)
        return str(res.inserted_id)
    except Exception as e:
        logger.warning(f"[MongoDB] Failed to archive email document: {e}")
        return None

async def archive_ai_interaction(interaction_payload: Dict[str, Any]) -> Optional[str]:
    """
    Archives an AI copilot query, synthesized response, RAG citations, and token metrics
    into the MongoDB `ai_conversations` collection.
    """
    db = get_mongodb_database()
    if db is None:
        return None

    try:
        doc = {
            **interaction_payload,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        res = await db.ai_conversations.insert_one(doc)
        return str(res.inserted_id)
    except Exception as e:
        logger.warning(f"[MongoDB] Failed to archive AI interaction: {e}")
        return None

async def archive_audit_event(audit_payload: Dict[str, Any]) -> Optional[str]:
    """
    Archives enterprise audit events and system telemetry into the MongoDB `audit_events` collection.
    """
    db = get_mongodb_database()
    if db is None:
        return None

    try:
        doc = {
            **audit_payload,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        res = await db.audit_events.insert_one(doc)
        return str(res.inserted_id)
    except Exception as e:
        logger.warning(f"[MongoDB] Failed to archive audit event: {e}")
        return None
