from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.models.auth import User

router = APIRouter(prefix="/api/forum", tags=["Community Forum (Requirement 28.8)"])

class ThreadCreate(BaseModel):
    title: str
    category: str = "General" # General, Implementation, Customization, Accounting, Technical Support
    content: str
    tags: Optional[List[str]] = []

class ReplyCreate(BaseModel):
    content: str

# In-memory thread repository seeded with enterprise forum discussions
FORUM_THREADS = [
    {
        "id": "th-001",
        "title": "Best practices for multi-warehouse inventory valuation (FIFO vs Weighted Average)",
        "category": "Accounting",
        "author": "Priya Sharma (Finance Lead)",
        "author_email": "priya.sharma@nexaerp.internal",
        "content": "When configuring multiple regional warehouses in NexaERP, how do we best handle inter-branch stock transfers without triggering double valuation discrepancies in the General Ledger?",
        "tags": ["inventory", "accounting", "fifo", "multi-warehouse"],
        "is_pinned": True,
        "is_locked": False,
        "view_count": 342,
        "reply_count": 2,
        "accepted_answer_id": "rep-002",
        "created_at": "2026-10-10T08:30:00Z",
        "replies": [
            {
                "id": "rep-001",
                "author": "Karthik Verma (Solutions Architect)",
                "content": "You should enable Automated Clearing Accounts under Finance Settings. Inter-branch stock transfers will route through Account 1490 (Goods-in-Transit Clearing) ensuring exact GAAP matching.",
                "created_at": "2026-10-10T09:15:00Z",
                "is_accepted": False
            },
            {
                "id": "rep-002",
                "author": "Ananya Roy (CPA)",
                "content": "Confirmed. Setting up the Clearing Account also auto-reconciles GST input tax credits between branches with different GSTINs.",
                "created_at": "2026-10-10T10:45:00Z",
                "is_accepted": True
            }
        ]
    },
    {
        "id": "th-002",
        "title": "Optimizing Point-in-Time Recovery (PITR) WAL log stream storage",
        "category": "Technical Support",
        "author": "David Chen (Infrastructure SRE)",
        "author_email": "david.chen@nexaerp.internal",
        "content": "Our PostgreSQL Write-Ahead Log generation is around 25 GB/day under peak POS traffic. What is the recommended compression ratio for 90-day Glacier retention?",
        "tags": ["disaster-recovery", "pitr", "wal", "postgres"],
        "is_pinned": True,
        "is_locked": False,
        "view_count": 198,
        "reply_count": 1,
        "accepted_answer_id": "rep-003",
        "created_at": "2026-10-12T11:00:00Z",
        "replies": [
            {
                "id": "rep-003",
                "author": "System Administrator",
                "content": "Using Zstandard level 9 compression with the automated 3-tier lifecycle policy reduces 25 GB/day down to ~4.2 GB/day, satisfying the 90+ days retention mandate with minimal storage footprint.",
                "created_at": "2026-10-12T13:20:00Z",
                "is_accepted": True
            }
        ]
    },
    {
        "id": "th-003",
        "title": "Creating custom Industry 4.0 IoT telemetry alerts via Low-Code Engine",
        "category": "Customization",
        "author": "Rajesh Kumar (Plant Manager)",
        "author_email": "rajesh.k@nexaerp.internal",
        "content": "Can we bind temperature sensor spikes directly to automated maintenance work order generation without custom backend code?",
        "tags": ["industry40", "iot", "low-code", "workflows"],
        "is_pinned": False,
        "is_locked": False,
        "view_count": 145,
        "reply_count": 1,
        "accepted_answer_id": None,
        "created_at": "2026-10-14T14:10:00Z",
        "replies": [
            {
                "id": "rep-004",
                "author": "DevOps Lead",
                "content": "Yes, navigate to Customization -> Workflow Triggers, create a trigger on `work_centers.telemetry.temperature_c > 85.0` with action `CREATE_MAINTENANCE_ORDER`.",
                "created_at": "2026-10-14T15:00:00Z",
                "is_accepted": False
            }
        ]
    }
]

@router.get("/stats")
async def get_forum_stats():
    """Returns community forum engagement statistics."""
    total_threads = len(FORUM_THREADS)
    total_replies = sum(len(t["replies"]) for t in FORUM_THREADS)
    total_solved = sum(1 for t in FORUM_THREADS if t.get("accepted_answer_id"))
    categories = list(set(t["category"] for t in FORUM_THREADS))
    return {
        "total_threads": total_threads,
        "total_replies": total_replies,
        "total_solved_threads": total_solved,
        "categories": categories,
        "active_members_count": 86,
        "resolution_rate_percent": round((total_solved / total_threads * 100), 1) if total_threads > 0 else 0
    }

@router.get("/threads")
async def list_threads(
    category: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None
):
    """Lists community forum discussions with search and filtering."""
    results = FORUM_THREADS
    if category:
        results = [t for t in results if t["category"].lower() == category.lower()]
    if tag:
        results = [t for t in results if tag.lower() in [tg.lower() for tg in t.get("tags", [])]]
    if search:
        s = search.lower()
        results = [
            t for t in results
            if s in t["title"].lower() or s in t["content"].lower() or any(s in tg.lower() for tg in t.get("tags", []))
        ]
    
    # Sort pinned first, then by date desc
    return sorted(results, key=lambda t: (not t["is_pinned"], t["created_at"]), reverse=False)

@router.get("/threads/{thread_id}")
async def get_thread(thread_id: str):
    """Retrieves a thread and increments view count."""
    thread = next((t for t in FORUM_THREADS if t["id"] == thread_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread["view_count"] += 1
    return thread

@router.post("/threads", status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: ThreadCreate,
    current_user: User = Depends(get_current_user)
):
    """Creates a new community forum discussion thread."""
    thread_id = f"th-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    new_thread = {
        "id": thread_id,
        "title": payload.title,
        "category": payload.category,
        "author": current_user.full_name or current_user.username or "Community Member",
        "author_email": current_user.email,
        "content": payload.content,
        "tags": payload.tags or [],
        "is_pinned": False,
        "is_locked": False,
        "view_count": 1,
        "reply_count": 0,
        "accepted_answer_id": None,
        "created_at": now,
        "replies": []
    }
    FORUM_THREADS.insert(0, new_thread)
    return new_thread

@router.post("/threads/{thread_id}/replies", status_code=status.HTTP_201_CREATED)
async def post_reply(
    thread_id: str,
    payload: ReplyCreate,
    current_user: User = Depends(get_current_user)
):
    """Posts a reply to a forum discussion thread."""
    thread = next((t for t in FORUM_THREADS if t["id"] == thread_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.get("is_locked"):
        raise HTTPException(status_code=400, detail="Thread is locked for new replies")

    reply_id = f"rep-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    reply = {
        "id": reply_id,
        "author": current_user.full_name or current_user.username or "Community Contributor",
        "content": payload.content,
        "created_at": now,
        "is_accepted": False
    }
    thread["replies"].append(reply)
    thread["reply_count"] = len(thread["replies"])
    return reply

@router.patch("/threads/{thread_id}/pin")
async def toggle_pin_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user)
):
    """Moderator tool: Toggle thread pinned status."""
    thread = next((t for t in FORUM_THREADS if t["id"] == thread_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread["is_pinned"] = not thread["is_pinned"]
    return {"status": "SUCCESS", "is_pinned": thread["is_pinned"]}

@router.patch("/threads/{thread_id}/answer/{reply_id}")
async def mark_accepted_answer(
    thread_id: str,
    reply_id: str,
    current_user: User = Depends(get_current_user)
):
    """Marks a reply as the accepted answer."""
    thread = next((t for t in FORUM_THREADS if t["id"] == thread_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    reply = next((r for r in thread["replies"] if r["id"] == reply_id), None)
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    for r in thread["replies"]:
        r["is_accepted"] = (r["id"] == reply_id)
    thread["accepted_answer_id"] = reply_id
    return {"status": "SUCCESS", "accepted_answer_id": reply_id}
