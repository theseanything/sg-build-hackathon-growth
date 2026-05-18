"""
Mock Companies House + HMRC lookup service.

In production this would call:
  - GET https://api.company-information.service.gov.uk/company/{number}
  - HMRC Making Tax Digital API (OAuth 2.0) for revenue and PAYE data

For the hackathon we resolve the identifier against data/companies.json,
which is pre-populated with realistic profiles as if both APIs had already
responded. Each profile contains nested companies_house and hmrc sections
that mirror real API response shapes.
"""

import json
import os
from typing import Optional

_COMPANIES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "companies.json")
_cache: list | None = None


def _load_companies() -> list:
    global _cache
    if _cache is None:
        with open(_COMPANIES_PATH) as f:
            _cache = json.load(f)
    return _cache


def lookup_company(profile_id: str) -> Optional[dict]:
    """Look up a company by profile_id. Returns the raw companies.json profile or None."""
    for profile in _load_companies():
        if profile.get("profile_id") == profile_id:
            return profile
    return None


def list_profile_ids() -> list[str]:
    """Returns all available profile IDs."""
    return [p["profile_id"] for p in _load_companies()]
