import json
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "fundingfit.db")
SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "companies.json")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            profile_id   TEXT PRIMARY KEY,
            profile_data TEXT NOT NULL,
            first_seen   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS interaction_history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id   TEXT NOT NULL,
            action       TEXT NOT NULL,
            input_data   TEXT NOT NULL,
            output_data  TEXT NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()
    _seed_sessions_if_empty()


def _seed_sessions_if_empty() -> None:
    """Populate sessions from data/companies.json on first DB creation only.

    The DB is the source of truth for business profiles. companies.json is a
    seed file: once the sessions table has any rows, we never re-read it for
    runtime requests.
    """
    if not os.path.exists(SEED_PATH):
        return

    conn = get_db()
    try:
        already_seeded = conn.execute("SELECT 1 FROM sessions LIMIT 1").fetchone()
        if already_seeded:
            return

        with open(SEED_PATH) as f:
            profiles = json.load(f)

        for profile in profiles:
            profile_id = profile.get("profile_id")
            if not profile_id:
                continue
            conn.execute(
                "INSERT OR IGNORE INTO sessions (profile_id, profile_data) VALUES (?, ?)",
                (profile_id, json.dumps(profile)),
            )
        conn.commit()
    finally:
        conn.close()


def list_known_profile_ids() -> list[str]:
    """Returns all profile_ids known to the DB (post-seed)."""
    conn = get_db()
    try:
        rows = conn.execute("SELECT profile_id FROM sessions ORDER BY profile_id").fetchall()
    finally:
        conn.close()
    return [r["profile_id"] for r in rows]


# ── sessions ──────────────────────────────────────────────────────────────────

def upsert_session(profile_id: str, profile: dict) -> bool:
    """
    Create or refresh a session. Returns True if the session already existed,
    False if this is a first visit.
    """
    conn = get_db()
    try:
        existing = conn.execute(
            "SELECT 1 FROM sessions WHERE profile_id = ?", (profile_id,)
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE sessions SET last_seen = CURRENT_TIMESTAMP WHERE profile_id = ?",
                (profile_id,),
            )
            conn.commit()
            return True
        else:
            conn.execute(
                "INSERT INTO sessions (profile_id, profile_data) VALUES (?, ?)",
                (profile_id, json.dumps(profile)),
            )
            conn.commit()
            return False
    finally:
        conn.close()


def get_session(profile_id: str) -> dict | None:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM sessions WHERE profile_id = ?", (profile_id,)
        ).fetchone()
    finally:
        conn.close()
    return dict(row) if row else None


# ── business profiles ─────────────────────────────────────────────────────────

def upsert_business_profile(profile_id: str, profile: dict) -> None:
    """Update the stored profile JSON for an existing session."""
    conn = get_db()
    try:
        conn.execute(
            """
            UPDATE sessions
            SET profile_data = ?, last_seen = CURRENT_TIMESTAMP
            WHERE profile_id = ?
            """,
            (json.dumps(profile), profile_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_business_profile(profile_id: str) -> dict | None:
    session = get_session(profile_id)
    if not session:
        return None
    profile = json.loads(session["profile_data"])
    profile["goals"] = profile.get("goals") or []
    return profile


# ── interaction history ───────────────────────────────────────────────────────

def save_interaction(profile_id: str, action: str, input_data: dict, output_data) -> int:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO interaction_history (profile_id, action, input_data, output_data) VALUES (?, ?, ?, ?)",
            (
                profile_id,
                action,
                json.dumps(input_data),
                json.dumps(output_data) if not isinstance(output_data, str) else output_data,
            ),
        )
        conn.commit()
        return conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    finally:
        conn.close()


def get_history(profile_id: str) -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM interaction_history WHERE profile_id = ? ORDER BY created_at DESC",
            (profile_id,),
        ).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


def get_interaction(profile_id: str, interaction_id: int) -> dict | None:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM interaction_history WHERE id = ? AND profile_id = ?",
            (interaction_id, profile_id),
        ).fetchone()
    finally:
        conn.close()
    return dict(row) if row else None
