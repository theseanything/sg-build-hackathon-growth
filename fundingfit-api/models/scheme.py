from typing import Any, List, Literal, Optional

from pydantic import BaseModel


class EligibilityItem(BaseModel):
    label: str
    status: Literal["met", "unmet", "unknown"]


class SchemeSummary(BaseModel):
    scheme_id: str
    name: str
    provider: str
    type: str
    repayable: bool
    funding_display: str
    effort_display: str
    url: str


class SchemeDetail(BaseModel):
    scheme_id: str
    name: str
    provider: str
    url: str
    type: str
    repayable: bool
    funding: dict[str, Any]
    summary: str
    eligibility: list[dict[str, Any]]
    documents: list[str]
    restrictions: list[str]
    effort: dict[str, Any]
    timeline: dict[str, Any]
    last_verified: Optional[str] = None
    plain_english_summary: str


class SchemeResult(BaseModel):
    scheme_id: str
    name: str
    provider: str
    region: str
    funding_display: str
    effort_hours: float
    fit: str  # strong_match | possible | not_suitable
    fit_reason: str
    plain_english_summary: str
    eligibility_items: List[EligibilityItem]
    url: str


class PlanItem(BaseModel):
    scheme_id: str
    name: str
    shared_requirements: List[str]
    scheme_specific_requirements: List[str]


class PlanResponse(BaseModel):
    shared_requirements: List[str]
    schemes: List[PlanItem]
