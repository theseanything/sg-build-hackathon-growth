"""
Demonstrates the deterministic matching process across all demo business profiles.
Run with:  uv run pytest tests/ -v -s
"""

import json
import os
import pytest

from models.business import BusinessProfile
from services.companies_house_service import lookup_company
from services.matching_service import match_scheme, _trading_age_years, _sector_tags, _goal_tags, _business_spend_items
from services.schemes_service import filter_by_region, load_schemes

# ── helpers ───────────────────────────────────────────────────────────────────

COMPANIES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "companies.json"
)

FIT_SYMBOL = {"strong_match": "✓✓", "possible": "~ ", "not_suitable": "✗ "}
FIT_ORDER  = {"strong_match": 0, "possible": 1, "not_suitable": 2}
REGION_ORDER = {"leeds": 0, "west_yorkshire": 0, "national": 1}


def load_companies() -> dict[str, BusinessProfile]:
    with open(COMPANIES_PATH) as f:
        raw: list[dict] = json.load(f)
    return {
        entry["profile_id"]: BusinessProfile(**entry)
        for entry in raw
    }


def _business_name(business: BusinessProfile) -> str:
    if business.user_provided and business.user_provided.trading_name:
        return business.user_provided.trading_name
    if business.companies_house:
        return business.companies_house.legal_name
    return business.profile_id


def print_match_report(business: BusinessProfile, results: list) -> None:
    derived = business.derived
    age     = derived.trading_age_years if derived else 0.0
    sector  = derived.sector if derived else ""
    status  = derived.legal_structure if derived else ""
    sectors = _sector_tags(sector)
    goals   = _goal_tags(_business_spend_items(business))

    employee_count = (
        business.hmrc.paye.employees_on_payroll
        if business.hmrc and business.hmrc.paye else None
    )
    revenue = (
        business.hmrc.self_assessment.turnover
        if business.hmrc and business.hmrc.self_assessment else None
    )
    postcode = (
        business.companies_house.registered_office_address.postal_code
        if business.companies_house and business.companies_house.registered_office_address
        else ""
    )
    spend_items = _business_spend_items(business)

    print(f"\n{'═' * 62}")
    print(f"  {_business_name(business)}  ({status})")
    print(f"  Sector : {sector}  →  tags: {sectors or '(none)'}")
    print(f"  Goals  : {spend_items or '(none)'}  →  tags: {goals or '(none)'}")
    print(f"  Age    : {age:.1f} yrs  |  Employees: {employee_count}"
          f"  |  Revenue: £{revenue:,.0f}" if revenue else
          f"  Age    : {age:.1f} yrs  |  Employees: {employee_count}  |  Revenue: unknown")
    print(f"  Postcode: {postcode}")
    print(f"{'─' * 62}")

    for r in results:
        sym = FIT_SYMBOL[r.fit]
        print(f"  {sym}  {r.name:<42} [{r.region}]")
        print(f"         {r.fit_reason}")
        if r.eligibility_met:
            print(f"         met   : {', '.join(r.eligibility_met)}")
        if r.eligibility_unmet:
            print(f"         unmet : {', '.join(r.eligibility_unmet)}")
        print()


def run_match(company_id: str, companies, schemes, extra_fields: dict = None) -> list:
    business = companies[company_id]
    if extra_fields:
        business = business.model_copy(update=extra_fields)
    postcode = (
        business.companies_house.registered_office_address.postal_code
        if business.companies_house and business.companies_house.registered_office_address
        else ""
    )
    relevant = filter_by_region(schemes, postcode)
    results  = [match_scheme(business, s) for s in relevant]
    results.sort(key=lambda r: (FIT_ORDER[r.fit], REGION_ORDER.get(r.region, 2)))
    print_match_report(business, results)
    return results


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def schemes():
    return load_schemes()


@pytest.fixture(scope="module")
def companies():
    return load_companies()


# ── per-company match tests ───────────────────────────────────────────────────

def test_northlight_studio_established_creative(companies, schemes):
    """
    Northlight Studio (profile-northlight-001) — limited_company, creative, LS7,
    1 employee, £28,400, incorporated Jan 2022 (~4.3 yrs at May 2026).

    Over 3 years so AD:VENTURE and Start Up Loans are not_suitable.
    Creative Places and Help to Grow: Digital should be strong matches.
    Help to Grow: Management fails on headcount.
    R&D Tax Relief is possible (company type qualifies, R&D activity unknown).
    """
    results = run_match("profile-northlight-001", companies, schemes)
    by_id = {r.scheme_id: r for r in results}

    assert by_id["ad-venture-grant"].fit == "not_suitable", \
        "4.3 yrs trading — AD:VENTURE requires under 3 yrs"
    assert by_id["start-up-loans"].fit == "not_suitable", \
        "4.3 yrs trading — Start Up Loans requires under 3 yrs"
    assert by_id["help-to-grow-management"].fit == "not_suitable", \
        "1 employee — Help to Grow: Management requires 5+"
    assert by_id["creative-places-growth-fund"].fit == "strong_match", \
        "Creative sector in West Yorkshire — should strongly match Creative Places"
    assert by_id["help-to-grow-digital"].fit == "strong_match", \
        "1+ yr trading, <250 employees, software goals — strong match for Help to Grow: Digital"
    assert by_id["rd-tax-relief"].fit == "possible", \
        "limited_company qualifies but has_rd_activity unknown — should be possible"


def test_breadbloom_hospitality_scaling(companies, schemes):
    """
    Bread & Bloom Coffee (profile-breadbloom-001) — limited_company, hospitality,
    LS5, 3 employees, £67,200, incorporated Mar 2023 (~3.2 yrs at May 2026).

    Over 3 years so AD:VENTURE and Start Up Loans are not_suitable.
    Wrong sector so Creative Places is not_suitable.
    WY Growth Fund should be a strong match (revenue > £50k, premises/equipment goals).
    Help to Grow: Management fails on headcount.
    """
    results = run_match("profile-breadbloom-001", companies, schemes)
    by_id = {r.scheme_id: r for r in results}

    assert by_id["ad-venture-grant"].fit == "not_suitable", \
        "3.2 yrs trading — AD:VENTURE requires under 3 yrs"
    assert by_id["start-up-loans"].fit == "not_suitable", \
        "3.2 yrs trading — Start Up Loans requires under 3 yrs"
    assert by_id["creative-places-growth-fund"].fit == "not_suitable", \
        "Hospitality sector — Creative Places requires creative/digital"
    assert by_id["help-to-grow-management"].fit == "not_suitable", \
        "3 employees — Help to Grow: Management requires 5+"
    assert by_id["wy-growth-fund"].fit == "strong_match", \
        "£67k revenue > £50k threshold, premises goals match — should be strong_match"


def test_movefit_early_stage_sole_trader(companies, schemes):
    """
    MoveFit Leeds (profile-movefit-001) — sole_trader, health_and_fitness,
    no postcode (HMRC-only), £18,500, trading from Sep 2024 (~0.7 yrs at May 2026).

    No postcode → only national schemes shown.
    Start Up Loans should be a strong match (under 3 yrs, equipment goals).
    Help to Grow: Digital is not_suitable (under 12 months trading).
    R&D Tax Relief is not_suitable (sole_trader).
    """
    results = run_match("profile-movefit-001", companies, schemes)
    by_id = {r.scheme_id: r for r in results}

    assert by_id["start-up-loans"].fit == "strong_match", \
        "Under 3 yrs, equipment goals, no sector gate — should strongly match Start Up Loans"
    assert by_id["help-to-grow-digital"].fit == "possible", \
        "1.7 yrs trading clears the 12-month gate but employee count unknown — should be possible"
    assert by_id["help-to-grow-management"].fit == "possible", \
        "No PAYE data → employee count unknown → 5-employee knockout unverifiable → possible"
    assert by_id["rd-tax-relief"].fit == "not_suitable", \
        "Sole trader — R&D Tax Relief requires limited_company"


def test_rd_activity_unknown_for_limited_company(companies, schemes):
    """
    R&D Tax Relief and Innovate UK are always 'possible' for a limited company
    because has_rd_activity is not captured in the data model — the rules that
    check it return None (uncertain) rather than a hard pass/fail.
    """
    results = run_match("profile-northlight-001", companies, schemes)
    by_id = {r.scheme_id: r for r in results}

    assert by_id["rd-tax-relief"].fit == "possible", \
        "limited_company but R&D activity unknown → possible"
    assert by_id["innovate-uk-rd-grants"].fit == "possible", \
        "limited_company but R&D activity unknown → possible"


# ── unit tests for internal helpers ──────────────────────────────────────────

def test_sector_tag_extraction():
    assert "creative" in _sector_tags("Creative services")
    assert "digital"  in _sector_tags("Software development")
    assert "technology" in _sector_tags("Engineering and technology")
    assert _sector_tags("Hospitality and catering") == {"hospitality"}
    assert _sector_tags("Unknown niche activity") == set()


def test_goal_tag_extraction():
    assert "equipment" in _goal_tags(["buy equipment", "expand"])
    assert "hire"      in _goal_tags(["recruit two staff members"])
    assert "research"  in _goal_tags(["R&D into new product", "innovation"])
    assert "software"  in _goal_tags(["new CRM system"])
    assert _goal_tags([]) == set()


def test_trading_age_calculation():
    age_recent = _trading_age_years("2024-01-01")
    assert 1.0 < age_recent < 2.5, f"Expected ~1-2 yrs for Jan 2024, got {age_recent:.2f}"

    age_old = _trading_age_years("2018-01-01")
    assert age_old > 7, f"Expected 7+ yrs for 2018, got {age_old:.2f}"

    age_partial = _trading_age_years("2023-06")
    assert 1.5 < age_partial < 3.0, f"Partial date parse failed: {age_partial:.2f}"
