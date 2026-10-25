import os
import json
import asyncio
import logging
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

DOC_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "mongo_docs"
DOC_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class CrossProcessFileLock:
    """Provides atomic cross-process file locking for local JSON document store claims."""
    def __init__(self, lock_file: Path, timeout: float = 5.0):
        self.lock_file = lock_file
        self.timeout = timeout
        self.handle = None

    def __enter__(self):
        start = time.time()
        while time.time() - start < self.timeout:
            try:
                if os.name == "nt":
                    import msvcrt
                    self.handle = open(self.lock_file, "a+b")
                    msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
                    return self
                else:
                    import fcntl
                    self.handle = open(self.lock_file, "a+b")
                    fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    return self
            except (IOError, OSError, BlockingIOError):
                if self.handle:
                    try:
                        self.handle.close()
                    except Exception:
                        pass
                    self.handle = None
                time.sleep(0.02)
        raise TimeoutError(f"Could not acquire cross-process lock on {self.lock_file}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.handle:
            try:
                if os.name == "nt":
                    import msvcrt
                    self.handle.seek(0)
                    msvcrt.locking(self.handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(self.handle.fileno(), fcntl.LOCK_UN)
            except Exception:
                pass
            finally:
                try:
                    self.handle.close()
                except Exception:
                    pass
                self.handle = None

SECURITY_SENSITIVE_COLLECTIONS = {
    "employee_access_authorizations"
}

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
        self._client_loop = None
        self._is_mongo_connected = False
        self._mongo_uri = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
        self._db_name = os.getenv("MONGODB_DB_NAME", "nexaerp")
        self._last_connect_attempt = 0.0
        self._connect_retry_delay = 5.0

    async def _try_connect_mongo(self) -> bool:
        try:
            cur_loop = asyncio.get_running_loop()
        except RuntimeError:
            cur_loop = asyncio.get_event_loop()

        if self._is_mongo_connected and self._mongo_client is not None:
            if self._client_loop is not cur_loop:
                self._is_mongo_connected = False
                try:
                    self._mongo_client.close()
                except Exception:
                    pass
                self._mongo_client = None
                self._db = None
                self._client_loop = None
            else:
                return True

        now = cur_loop.time()
        if self._last_connect_attempt > 0 and (now - self._last_connect_attempt) < self._connect_retry_delay:
            return self._is_mongo_connected

        self._last_connect_attempt = now
        try:
            import motor.motor_asyncio
            client = motor.motor_asyncio.AsyncIOMotorClient(
                self._mongo_uri,
                serverSelectionTimeoutMS=1000,
                connectTimeoutMS=1000
            )
            # Ping database to check if mongod daemon is running
            await client.admin.command('ping')
            self._mongo_client = client
            self._db = client[self._db_name]
            self._client_loop = cur_loop
            self._is_mongo_connected = True
            try:
                # SEC-42 & BUG-29: Ensure unique index on user_id for branch context
                await self._db["user_session_branch_context"].create_index("user_id", unique=True)
            except Exception:
                pass
            logger.info("Connected to MongoDB Community Edition at %s (DB: %s)", self._mongo_uri, self._db_name)
            return True
        except Exception as e:
            logger.info("MongoDB connection failed or server not responding (%s). Retrying after %ss backoff.", e, self._connect_retry_delay)
            self._is_mongo_connected = False
            self._mongo_client = None
            self._db = None
            self._client_loop = None
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
        key_fields = ["employee_code", "email", "id", "_id", "user_id"]
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
        """Atomically upsert a document keyed by unique query filter to prevent duplication (Error 10 / BUG-29)."""
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
                logger.warning("MongoDB upsert failed: %s", e)
                # SEC-50: For synchronization queues and security data requiring durable persistence, propagate failure
                if collection_name in ["module_drafts", *SECURITY_SENSITIVE_COLLECTIONS]:
                    raise RuntimeError(f"Durable document store write failed for '{collection_name}': {e}")

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
                # SEC-41: When MongoDB is connected and query succeeds, return result immediately!
                # Do NOT fall through to stale local store.
                return None
            except Exception as e:
                logger.warning("MongoDB read failed: %s", e)
                self._is_mongo_connected = False
                if collection_name in SECURITY_SENSITIVE_COLLECTIONS:
                    logger.error("Authoritative store unavailable for security collection '%s'. Failing closed.", collection_name)
                    return None

        # SEC-41: Security-sensitive collections fail closed if authoritative store unavailable
        if collection_name in SECURITY_SENSITIVE_COLLECTIONS:
            logger.warning("Denying local fallback for security-sensitive collection '%s'.", collection_name)
            return None

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
                # SEC-41: Return authoritative MongoDB results immediately (even if empty)
                return results
            except Exception as e:
                logger.warning("MongoDB find failed: %s", e)
                self._is_mongo_connected = False
                if collection_name in SECURITY_SENSITIVE_COLLECTIONS:
                    logger.error("Authoritative store unavailable for security collection '%s'. Failing closed.", collection_name)
                    return []

        # SEC-41: Security-sensitive collections fail closed if authoritative store unavailable
        if collection_name in SECURITY_SENSITIVE_COLLECTIONS:
            logger.warning("Denying local fallback for security-sensitive collection '%s'.", collection_name)
            return []

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

    async def claim_document(self, collection_name: str, query: Dict[str, Any], updates: Dict[str, Any]) -> bool:
        """
        BUG-47 & BUG-55: Atomically and conditionally claims a document using upsert=False.
        Guarantees atomic single-worker claims with modified_count == 1 check
        and cross-process file locking on local fallback.
        """
        updates["updated_at"] = datetime.utcnow().isoformat()
        is_connected = await self._try_connect_mongo()
        if is_connected and self._db is not None:
            try:
                coll = self._db[collection_name]
                result = await coll.update_one(query, {"$set": updates}, upsert=False)
                claimed = (result.modified_count == 1)
                if claimed:
                    # Mirror update to local store
                    docs = self._read_local_collection(collection_name)
                    for idx, d in enumerate(docs):
                        if all(d.get(k) == v for k, v in query.items()):
                            docs[idx] = {**d, **updates}
                            break
                    self._write_local_collection(collection_name, docs)
                return claimed
            except Exception as e:
                logger.warning("MongoDB claim_document failed: %s", e)
                if collection_name in ["module_drafts", *SECURITY_SENSITIVE_COLLECTIONS]:
                    raise RuntimeError(f"Authoritative document store claim failed for '{collection_name}': {e}")

        # Fallback local store check-and-set claim with cross-process locking
        if collection_name in SECURITY_SENSITIVE_COLLECTIONS:
            return False

        lock_path = DOC_STORAGE_DIR / f"{collection_name}.lock"
        try:
            with CrossProcessFileLock(lock_path):
                docs = self._read_local_collection(collection_name)
                claimed = False
                for idx, d in enumerate(docs):
                    match = True
                    for k, v in query.items():
                        if d.get(k) != v:
                            match = False
                            break
                    if match:
                        docs[idx] = {**d, **updates}
                        claimed = True
                        break

                if claimed:
                    self._write_local_collection(collection_name, docs)
                return claimed
        except TimeoutError:
            logger.warning("Local store claim lock timeout for %s", collection_name)
            return False

    async def update_document(
        self,
        collection_name: str,
        query: Dict[str, Any],
        updates: Dict[str, Any],
        upsert: bool = False
    ) -> bool:
        """
        Updates an existing document matching query.
        If upsert=False, does not insert a new document and returns True only if a record was modified.
        """
        updates["updated_at"] = datetime.utcnow().isoformat()
        is_connected = await self._try_connect_mongo()
        if is_connected and self._db is not None:
            try:
                coll = self._db[collection_name]
                res = await coll.update_one(query, {"$set": updates}, upsert=upsert)
                matched = (res.modified_count == 1) or (res.matched_count == 1) or (upsert and res.upserted_id is not None)
                if matched:
                    docs = self._read_local_collection(collection_name)
                    for idx, d in enumerate(docs):
                        if all(d.get(k) == v for k, v in query.items()):
                            docs[idx] = {**d, **updates}
                            break
                    self._write_local_collection(collection_name, docs)
                return matched
            except Exception as e:
                logger.warning("MongoDB update failed: %s", e)
                if collection_name in ["module_drafts", *SECURITY_SENSITIVE_COLLECTIONS]:
                    raise RuntimeError(f"Durable document store update failed for '{collection_name}': {e}")

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
        
        if not updated and upsert:
            # Upsert
            docs.append({**query, **updates})
            updated = True

        if updated:
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
