import os
import json
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

DOC_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "mongo_docs"
DOC_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class DocumentStoreService:
    """
    Dual-engine Free Document Store:
    1. Primary: MongoDB Community Edition (connecting via motor/pymongo to mongodb://127.0.0.1:27017).
    2. Fallback: Local Free Persistent Document Store (zero-cost, zero-dependency JSON engine).
    Stores flexible schemas such as Employee Onboarding Branch Access, App Roles, and Module Permissions.
    """
    def __init__(self):
        self._mongo_client = None
        self._db = None
        self._is_mongo_connected = False
        self._mongo_uri = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
        self._db_name = os.getenv("MONGODB_DB_NAME", "nexaerp")
        self._init_attempted = False

    async def _try_connect_mongo(self) -> bool:
        if self._init_attempted:
            return self._is_mongo_connected
        
        self._init_attempted = True
        try:
            import motor.motor_asyncio
            client = motor.motor_asyncio.AsyncIOMotorClient(
                self._mongo_uri,
                serverSelectionTimeoutMS=800,
                connectTimeoutMS=800
            )
            # Ping database to check if mongod daemon is running
            await client.admin.command('ping')
            self._mongo_client = client
            self._db = client[self._db_name]
            self._is_mongo_connected = True
            logger.info("Connected to MongoDB Community Edition at %s (DB: %s)", self._mongo_uri, self._db_name)
            return True
        except Exception as e:
            logger.info("MongoDB Community Server not responding (%s). Using Free Local Document Store fallback at %s", e, DOC_STORAGE_DIR)
            self._is_mongo_connected = False
            return False

    def _get_local_file_path(self, collection_name: str) -> Path:
        return DOC_STORAGE_DIR / f"{collection_name}.json"

    def _read_local_collection(self, collection_name: str) -> List[Dict[str, Any]]:
        path = self._get_local_file_path(collection_name)
        if not path.exists():
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading local document store for %s: %s", collection_name, e)
            return []

    def _write_local_collection(self, collection_name: str, docs: List[Dict[str, Any]]):
        path = self._get_local_file_path(collection_name)
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(docs, f, indent=2, default=str)
        except Exception as e:
            logger.error("Error writing local document store for %s: %s", collection_name, e)

    async def insert_document(self, collection_name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        """Insert or upsert a document into MongoDB or local free document store."""
        doc = dict(document)
        if "created_at" not in doc:
            doc["created_at"] = datetime.utcnow().isoformat()
        doc["updated_at"] = datetime.utcnow().isoformat()

        is_connected = await self._try_connect_mongo()
        if is_connected and self._db is not None:
            try:
                coll = self._db[collection_name]
                res = await coll.insert_one(doc)
                doc["_id"] = str(res.inserted_id)
                doc["storage_engine"] = "MongoDB Community Edition"
                # Keep local mirror synchronized
                local_docs = self._read_local_collection(collection_name)
                local_docs.append(doc)
                self._write_local_collection(collection_name, local_docs)
                return doc
            except Exception as e:
                logger.warning("MongoDB write failed, falling back to local free store: %s", e)

        # Free local document store fallback
        doc["storage_engine"] = "Local Free Document Store (Persistent JSON Engine)"
        local_docs = self._read_local_collection(collection_name)
        
        # Check if matching unique identifier (e.g., employee_code or email)
        key_fields = ["employee_code", "email", "id", "_id"]
        updated = False
        for key in key_fields:
            if key in doc and doc[key]:
                for idx, existing in enumerate(local_docs):
                    if existing.get(key) == doc[key]:
                        local_docs[idx] = {**existing, **doc}
                        updated = True
                        break
            if updated:
                break
        
        if not updated:
            local_docs.append(doc)

        self._write_local_collection(collection_name, local_docs)
        return doc

    async def upsert_document(self, collection_name: str, query: Dict[str, Any], document: Dict[str, Any]) -> Dict[str, Any]:
        """Atomically upsert a document keyed by unique query filter to prevent duplication (Error 10)."""
        doc = dict(document)
        now_iso = datetime.utcnow().isoformat()
        if "created_at" not in doc:
            doc["created_at"] = now_iso
        doc["updated_at"] = now_iso

        is_connected = await self._try_connect_mongo()
        if is_connected and self._db is not None:
            try:
                coll = self._db[collection_name]
                await coll.update_one(query, {"$set": doc}, upsert=True)
                doc["storage_engine"] = "MongoDB Community Edition"
                # Keep local mirror synchronized
                local_docs = self._read_local_collection(collection_name)
                found = False
                for idx, existing in enumerate(local_docs):
                    if all(existing.get(k) == v for k, v in query.items()):
                        local_docs[idx] = {**existing, **doc}
                        found = True
                        break
                if not found:
                    local_docs.append(doc)
                self._write_local_collection(collection_name, local_docs)
                return doc
            except Exception as e:
                logger.warning("MongoDB upsert failed, falling back to local free store: %s", e)

        # Free local document store fallback
        doc["storage_engine"] = "Local Free Document Store (Persistent JSON Engine)"
        local_docs = self._read_local_collection(collection_name)
        found = False
        for idx, existing in enumerate(local_docs):
            if all(existing.get(k) == v for k, v in query.items()):
                local_docs[idx] = {**existing, **doc}
                found = True
                break
        if not found:
            local_docs.append(doc)

        self._write_local_collection(collection_name, local_docs)
        return doc

    async def find_document(self, collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        is_connected = await self._try_connect_mongo()
        if is_connected and self._db is not None:
            try:
                coll = self._db[collection_name]
                doc = await coll.find_one(query)
                if doc:
                    if "_id" in doc:
                        doc["_id"] = str(doc["_id"])
                    return doc
            except Exception as e:
                logger.warning("MongoDB read failed: %s", e)

        # Fallback local lookup
        docs = self._read_local_collection(collection_name)
        def _matches(d: Dict[str, Any], q: Dict[str, Any]) -> bool:
            if "$or" in q:
                return any(_matches(d, sub) for sub in q["$or"])
            for k, v in q.items():
                if d.get(k) != v:
                    return False
            return True

        for d in docs:
            if _matches(d, query):
                return d
        return None

    async def find_documents(self, collection_name: str, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        is_connected = await self._try_connect_mongo()
        if is_connected and self._db is not None:
            try:
                coll = self._db[collection_name]
                cursor = coll.find(query or {})
                results = []
                async for doc in cursor:
                    if "_id" in doc:
                        doc["_id"] = str(doc["_id"])
                    results.append(doc)
                if results:
                    return results
            except Exception as e:
                logger.warning("MongoDB find failed: %s", e)

        # Fallback local lookup
        docs = self._read_local_collection(collection_name)
        if not query:
            return docs

        def _matches(d: Dict[str, Any], q: Dict[str, Any]) -> bool:
            if "$or" in q:
                return any(_matches(d, sub) for sub in q["$or"])
            for k, v in q.items():
                if d.get(k) != v:
                    return False
            return True

        return [d for d in docs if _matches(d, query)]

    async def update_document(self, collection_name: str, query: Dict[str, Any], updates: Dict[str, Any]) -> bool:
        updates["updated_at"] = datetime.utcnow().isoformat()
        is_connected = await self._try_connect_mongo()
        if is_connected and self._db is not None:
            try:
                coll = self._db[collection_name]
                await coll.update_one(query, {"$set": updates}, upsert=True)
            except Exception as e:
                logger.warning("MongoDB update failed: %s", e)

        # Update local
        docs = self._read_local_collection(collection_name)
        updated = False
        for idx, d in enumerate(docs):
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                docs[idx] = {**d, **updates}
                updated = True
                break
        
        if not updated:
            # Upsert
            docs.append({**query, **updates})
            updated = True

        self._write_local_collection(collection_name, docs)
        return updated

    async def get_storage_status(self) -> Dict[str, Any]:
        is_connected = await self._try_connect_mongo()
        return {
            "active_storage": "MongoDB Community Edition" if is_connected else "Local Free Document Store (Persistent JSON Engine)",
            "is_mongo_connected": is_connected,
            "mongodb_uri": self._mongo_uri if is_connected else "Local Free Store Active (No external MongoDB setup needed)",
            "database_name": self._db_name,
            "free_fallback_directory": str(DOC_STORAGE_DIR),
            "free_edition_guarantee": "100% Free & Open Source Storage with zero cloud cost or monthly fees"
        }

document_store = DocumentStoreService()
