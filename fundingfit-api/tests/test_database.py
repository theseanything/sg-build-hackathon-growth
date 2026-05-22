import os
import tempfile

import database as db


def test_reset_db_restores_seed_profiles(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setattr(db, "DB_PATH", path)

    try:
        db.init_db()
        profile_id = "profile-northlight-001"
        profile = db.get_business_profile(profile_id)
        assert profile is not None

        profile.setdefault("user_provided", {})["owner_age"] = 99
        db.upsert_business_profile(profile_id, profile)
        db.save_interaction(profile_id, "match", {"mock": True}, [])

        result = db.reset_db()

        assert result["seeded_profiles"] == 3
        assert profile_id in result["profile_ids"]
        assert len(db.get_history(profile_id)) == 0

        restored = db.get_business_profile(profile_id)
        assert restored is not None
        assert restored["user_provided"]["owner_age"] != 99
    finally:
        os.unlink(path)
