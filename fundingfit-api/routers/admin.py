from fastapi import APIRouter

import database as db

router = APIRouter()


@router.post("/admin/reset")
async def reset_database():
    """Wipe SQLite state and re-seed demo profiles (fresh deploy)."""
    result = db.reset_db()
    return {"status": "reset", **result}
