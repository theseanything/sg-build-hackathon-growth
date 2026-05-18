"""
FastAPI dependency that resolves an X-Session-ID header to a user session.

The session ID is a profile_id (e.g. "profile-breadbloom-001"). Profiles are
stored in SQLite; companies.json seeds the database on first startup only.
"""

from fastapi import Header, HTTPException

import database as db


def require_user(x_session_id: str = Header(...)) -> dict:
    """Return the session row for a known profile_id. Raises 401 if not found."""
    session = db.get_session(x_session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Unknown profile ID")
    db.touch_session(x_session_id)
    return session


def optional_user(x_session_id: str = Header(default=None)) -> dict | None:
    """Returns the session row or None — no error if header is absent or unknown."""
    if not x_session_id:
        return None
    session = db.get_session(x_session_id)
    if not session:
        return None
    db.touch_session(x_session_id)
    return session
