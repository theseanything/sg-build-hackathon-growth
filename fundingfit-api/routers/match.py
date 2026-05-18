from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

import database as db
from models.business import BusinessProfile
from models.scheme import SchemeResult
from services.identity_service import optional_user
from services.matching_service import match_all
from services.schemes_service import filter_by_region, load_schemes

router = APIRouter()

_FIT_ORDER = {"strong_match": 0, "possible": 1, "not_suitable": 2}
_REGION_ORDER = {"leeds": 0, "west_yorkshire": 0, "national": 1}

_MOCK_RESULTS: List[SchemeResult] = [
    SchemeResult(
        scheme_id="ad-venture-grant",
        name="AD:VENTURE Grant",
        provider="West Yorkshire Combined Authority",
        region="west_yorkshire",
        funding_display="Up to £5,000",
        effort_hours=2,
        fit="strong_match",
        fit_reason="Trading under 3 years in West Yorkshire in an eligible creative sector.",
        plain_english_summary=(
            "A grant for early-stage businesses in West Yorkshire's creative, digital, "
            "and professional services sectors. It can fund equipment, marketing, and "
            "other growth costs up to £5,000."
        ),
        eligibility_met=["Based in West Yorkshire", "Trading under 3 years", "Eligible sector"],
        eligibility_unmet=[],
        url="https://ad-venture.org.uk",
    ),
    SchemeResult(
        scheme_id="wy-growth-fund",
        name="WY Growth Fund",
        provider="West Yorkshire Combined Authority",
        region="west_yorkshire",
        funding_display="Up to £25,000",
        effort_hours=6,
        fit="possible",
        fit_reason="Based in West Yorkshire and trading over 1 year, but a scaling plan and financial projections will need to be demonstrated.",
        plain_english_summary=(
            "A larger grant for West Yorkshire businesses that are ready to grow. "
            "You will need a clear written growth plan and 12-month financial projections to apply."
        ),
        eligibility_met=["Based in West Yorkshire", "Trading over 1 year"],
        eligibility_unmet=["Scaling plan required", "Financial projections required"],
        url="https://westyorks-ca.gov.uk/business",
    ),
    SchemeResult(
        scheme_id="start-up-loans",
        name="Start Up Loans",
        provider="British Business Bank",
        region="national",
        funding_display="£500–£25,000",
        effort_hours=4,
        fit="strong_match",
        fit_reason="UK-based and trading under 3 years, meeting the core eligibility criteria.",
        plain_english_summary=(
            "A government-backed personal loan for new UK businesses trading under three years. "
            "The most important thing to know is that it involves a personal credit check."
        ),
        eligibility_met=["UK-based", "Trading under 3 years"],
        eligibility_unmet=["Personal credit check required"],
        url="https://www.startuploans.co.uk",
    ),
    SchemeResult(
        scheme_id="leeds-city-council-grants",
        name="Leeds City Council Business Grants",
        provider="Leeds City Council",
        region="leeds",
        funding_display="Varies by scheme",
        effort_hours=3,
        fit="strong_match",
        fit_reason="Based in Leeds with a qualifying early-stage business.",
        plain_english_summary=(
            "A range of grants for businesses based in Leeds, typically supporting "
            "local job creation and early-stage growth. Eligibility varies by scheme."
        ),
        eligibility_met=["Based in Leeds"],
        eligibility_unmet=["Check current live schemes on Leeds City Council website"],
        url="https://www.leeds.gov.uk/business-support-and-advice/helping-your-business-grow",
    ),
    SchemeResult(
        scheme_id="help-to-grow-management",
        name="Help to Grow: Management",
        provider="Department for Business & Trade",
        region="national",
        funding_display="90% subsidised leadership programme",
        effort_hours=1,
        fit="not_suitable",
        fit_reason="Requires 5 or more employees; this business currently has 1.",
        plain_english_summary=(
            "A subsidised 12-week leadership programme for small business owners with at least 5 staff. "
            "Not available to sole traders or businesses below the 5-employee threshold."
        ),
        eligibility_met=["Trading over 1 year", "UK-based"],
        eligibility_unmet=["Requires 5+ employees (currently 1)"],
        url="https://helptogrow.campaign.gov.uk",
    ),
    SchemeResult(
        scheme_id="rd-tax-relief",
        name="R&D Tax Relief",
        provider="HMRC",
        region="national",
        funding_display="Tax credit on qualifying R&D expenditure",
        effort_hours=8,
        fit="not_suitable",
        fit_reason="Only available to limited companies; this business is a sole trader.",
        plain_english_summary=(
            "A tax relief scheme for limited companies that spend money on research and development. "
            "Sole traders cannot claim this relief and an accountant is typically required."
        ),
        eligibility_met=[],
        eligibility_unmet=[
            "Limited company required (business is sole trader)",
            "Qualifying R&D spend required",
        ],
        url="https://www.gov.uk/guidance/corporation-tax-research-and-development-rd-relief",
    ),
]


def _sort_results(results: List[SchemeResult]) -> List[SchemeResult]:
    return sorted(
        results,
        key=lambda r: (_FIT_ORDER.get(r.fit, 99), _REGION_ORDER.get(r.region, 2)),
    )


@router.post("/match", response_model=List[SchemeResult])
async def match_schemes(
    mock: bool = False,
    user: Optional[dict] = Depends(optional_user),
):
    if mock:
        return _sort_results(_MOCK_RESULTS)

    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    profile_id = user["profile_id"]
    profile_data = db.get_business_profile(profile_id)
    if not profile_data:
        raise HTTPException(status_code=404, detail="No business profile found.")

    business = BusinessProfile(**profile_data)
    schemes = load_schemes()
    postcode = (
        business.companies_house.registered_office_address.postal_code
        if business.companies_house and business.companies_house.registered_office_address
        else ""
    )
    relevant = filter_by_region(schemes, postcode)
    results = await match_all(business, relevant)
    sorted_results = _sort_results(results)

    db.save_interaction(
        profile_id,
        "match",
        {"profile_id": profile_id},
        [r.model_dump() for r in sorted_results],
    )

    return sorted_results
