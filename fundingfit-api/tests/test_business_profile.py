import pytest
from fastapi.testclient import TestClient

import database as db
import main


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_path))
    db.init_db()

    with TestClient(main.app) as test_client:
        yield test_client


PROFILE_ID = "profile-breadbloom-001"


def test_get_and_patch_business_profile(client: TestClient):
    get_response = client.get(
        "/api/business/me",
        headers={"X-Session-ID": PROFILE_ID},
    )
    assert get_response.status_code == 200
    original = get_response.json()

    patch_response = client.patch(
        "/api/business/me",
        headers={"X-Session-ID": PROFILE_ID},
        json={
            "owner_age": 39,
            "employee_count": 7,
            "annual_revenue": 125000.0,
        },
    )
    assert patch_response.status_code == 200
    updated = patch_response.json()

    assert updated["user_provided"]["owner_age"] == 39
    assert updated["hmrc"]["paye"]["employees_on_payroll"] == 7
    assert updated["hmrc"]["self_assessment"]["turnover"] == 125000.0

    get_again = client.get(
        "/api/business/me",
        headers={"X-Session-ID": PROFILE_ID},
    )
    assert get_again.status_code == 200
    persisted = get_again.json()
    assert persisted["user_provided"]["owner_age"] == 39
    assert persisted["hmrc"]["paye"]["employees_on_payroll"] == 7
    assert persisted["hmrc"]["self_assessment"]["turnover"] == 125000.0

    assert original["profile_id"] == PROFILE_ID


def test_unknown_profile_returns_401(client: TestClient):
    response = client.get(
        "/api/business/me",
        headers={"X-Session-ID": "profile-does-not-exist"},
    )
    assert response.status_code == 401
