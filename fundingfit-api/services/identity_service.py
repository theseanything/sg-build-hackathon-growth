"""
FastAPI dependency that resolves an X-Session-ID header to a user session.

The session ID is a profile_id stored in the SQLite sessions table
(seeded from data/companies.json on first DB creation). The DB is the
source of truth — we never read companies.json on a per-request basis.
"""

from fastapi import Header, HTTPException

import database as db


def require_user(x_session_id: str = Header(...)) -> dict:
    """
    Looks up the profile_id in the DB and returns the session row.
    Raises 401 if the profile_id is not recognised.
    """
    session = db.get_session(x_session_id)
    if not session:
        raise HTTPException(
            status_code=401,
            detail=f"Unknown profile ID. Available IDs: {db.list_known_profile_ids()}",
        )
    return session


def optional_user(x_session_id: str = Header(default=None)) -> dict | None:
    """Returns the session row or None — no error if header is absent or unrecognised."""
    if not x_session_id:
        return None
    return db.get_session(x_session_id)
