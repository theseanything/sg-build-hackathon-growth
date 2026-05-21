import json
import os
from typing import Optional

_SCHEMES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "schemes.json")

_LEEDS_PREFIXES = {"LS"}
_WEST_YORKSHIRE_PREFIXES = {"LS", "BD", "HX", "HD", "WF"}


def load_schemes() -> list[dict]:
    with open(_SCHEMES_PATH, "r") as f:
        return json.load(f)


def get_scheme_by_id(scheme_id: str) -> Optional[dict]:
    for scheme in load_schemes():
        if scheme["id"] == scheme_id:
            return scheme
    return None


def infer_region(scheme: dict) -> str:
    """
    Derives a scheme's geographic scope from its eligibility criteria.
    Returns "leeds", "west_yorkshire", or "national".
    """
    for item in scheme.get("eligibility", []):
        if item.get("type") == "geography":
            criterion = item.get("criterion", "").lower()
            if "leeds" in criterion:
                return "leeds"
            if "west yorkshire" in criterion:
                return "west_yorkshire"
            if "yorkshire" in criterion:
                return "west_yorkshire"
    return "national"


def infer_business_regions(postcode: str) -> set[str]:
    """Returns the set of regions a business belongs to based on postcode prefix."""
    if not postcode:
        return set()
    prefix = postcode[:2].upper().strip()
    regions: set[str] = {"national"}
    if prefix in _WEST_YORKSHIRE_PREFIXES:
        regions.add("west_yorkshire")
    if prefix in _LEEDS_PREFIXES:
        regions.add("leeds")
    return regions


def filter_by_region(schemes: list[dict], postcode: str) -> list[dict]:
    matched_regions = infer_business_regions(postcode) or {"national"}
    return [s for s in schemes if infer_region(s) in matched_regions]
