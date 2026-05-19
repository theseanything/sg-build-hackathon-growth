from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

import database as db
from models.business import BusinessProfile, BusinessProfileUpdate
from services.identity_service import require_user

router = APIRouter()

_GOAL_PROMPT_FIELDS = {
    "growth_goal": "growth_goal",
    "funding_goal": "funding_need",
    "constraints": "constraints",
}


def _ensure_goal_session(profile: dict) -> dict:
    goals = profile.setdefault("goals", [])
    if not goals:
        goals.append(
            {
                "session_id": "onboarding",
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "raw": [],
                "extracted": None,
            }
        )
    return goals[-1]


def _update_goal_response(profile: dict, prompt: str, response: str) -> None:
    goal_session = _ensure_goal_session(profile)
    raw = goal_session.setdefault("raw", [])
    for entry in raw:
        if entry.get("prompt") == prompt:
            entry["response"] = response
            return
    raw.append({"prompt": prompt, "response": response})


@router.get("/business/me", response_model=BusinessProfile)
async def get_my_business(user: dict = Depends(require_user)):
    profile = db.get_business_profile(user["profile_id"])
    if not profile:
        raise HTTPException(status_code=404, detail="No business profile found")
    return BusinessProfile(**profile)


@router.patch("/business/me", response_model=BusinessProfile)
async def update_my_business(
    update: BusinessProfileUpdate,
    user: dict = Depends(require_user),
):
    profile = db.get_business_profile(user["profile_id"])
    if not profile:
        raise HTTPException(status_code=404, detail="No business profile found")

    if update.owner_age is not None:
        profile.setdefault("user_provided", {})["owner_age"] = update.owner_age

    if update.employee_count is not None:
        profile.setdefault("hmrc", {}).setdefault("paye", {})["employees_on_payroll"] = update.employee_count

    if update.annual_revenue is not None:
        profile.setdefault("hmrc", {}).setdefault("self_assessment", {})["turnover"] = update.annual_revenue

    for field_name, prompt in _GOAL_PROMPT_FIELDS.items():
        value = getattr(update, field_name)
        if value is not None:
            _update_goal_response(profile, prompt, value)

    db.upsert_business_profile(user["profile_id"], profile)
    return BusinessProfile(**profile)
