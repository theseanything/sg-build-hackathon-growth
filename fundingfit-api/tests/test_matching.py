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

FIT_SYMBOL      = {"strong_match": "✓✓", "possible": "~ ", "not_suitable": "✗ "}
ITEM_SYMBOL     = {"met": "✓", "unmet": "✗", "unknown": "–"}
FIT_ORDER       = {"strong_match": 0, "possible": 1, "not_suitable": 2}
REGION_ORDER    = {"leeds": 0, "west_yorkshire": 0, "national": 1}


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
        for item in r.eligibility_items:
            print(f"           {ITEM_SYMBOL[item.status]}  {item.label}")
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

def test_northlight_studio_all_schemes(companies, schemes):
    """
    Northlight Studio (profile-northlight-001) — limited_company, creative, LS7,
    1 employee, £28,400, incorporated Jan 2022 (~4.3 yrs at May 2026).
    LS postcode → all schemes visible (national + west_yorkshire + leeds).

    Regional schemes (West Yorkshire):
      - AD:VENTURE: not_suitable — over 3-yr trading age knockout
      - WY Growth Fund: possible — revenue under £50k soft-fail; goals don't align
      - Creative Places: strong_match — creative sector + West Yorkshire met
      - Business Enterprise Fund: possible — goals (software/marketing) miss fund focus
    Regional schemes (Leeds):
      - Leeds City Council Grants: strong_match — Leeds location + marketing goal keyword
      - Business & IP Centre Leeds: strong_match — Leeds location + marketing goal keyword

    National schemes:
      - Start Up Loans: not_suitable — over 3-yr trading age knockout
      - Help to Grow: Digital: strong_match — 1+ yr trading, <250 employees, software goals
      - Help to Grow: Management: not_suitable — 1 employee fails 5+ headcount knockout
      - King's Trust Enterprise: possible — owner age not captured; knockout unverifiable
      - Innovate UK R&D Grants: possible — R&D activity cannot be automatically verified
      - R&D Tax Relief: possible — limited company qualifies but R&D activity unknown
    """
    results = run_match("profile-northlight-001", companies, schemes)
    by_id = {r.scheme_id: r for r in results}

    # West Yorkshire schemes
    assert by_id["ad-venture-grant"].fit == "not_suitable", \
        "4.3 yrs trading — AD:VENTURE requires under 3 yrs"
    assert by_id["wy-growth-fund"].fit == "possible", \
        "Revenue £28,400 < £50k (soft fail) and goals don't match fund keywords"
    assert by_id["creative-places-growth-fund"].fit == "strong_match", \
        "Creative sector + West Yorkshire — both sector and geography rules met"
    assert by_id["business-enterprise-fund"].fit == "possible", \
        "Geography and trading age met but software/marketing goals miss fund focus"

    # Leeds schemes
    assert by_id["leeds-city-council-grants"].fit == "strong_match", \
        "Based in Leeds + marketing goal keyword match — strong fit"
    assert by_id["business-ip-centre-leeds"].fit == "strong_match", \
        "Based in Leeds + marketing goal keyword match — no other eligibility gate"

    # National schemes
    assert by_id["start-up-loans"].fit == "not_suitable", \
        "4.3 yrs trading — Start Up Loans requires under 3 yrs"
    assert by_id["help-to-grow-digital"].fit == "strong_match", \
        "1+ yr trading, <250 employees, software goals — all criteria met"
    assert by_id["help-to-grow-management"].fit == "not_suitable", \
        "1 employee — Help to Grow: Management requires 5+"
    assert by_id["kings-trust-enterprise"].fit == "possible", \
        "Owner age not captured — age knockout cannot be verified"
    assert by_id["innovate-uk-rd-grants"].fit == "possible", \
        "R&D activity not in data model — always possible for any business"
    assert by_id["rd-tax-relief"].fit == "possible", \
        "Limited company clears structure knockout; R&D activity unknown"


def test_breadbloom_hospitality_all_schemes(companies, schemes):
    """
    Bread & Bloom Coffee (profile-breadbloom-001) — limited_company, hospitality,
    LS5, 3 employees, £67,200, incorporated Mar 2023 (~3.2 yrs at May 2026).
    LS postcode → all schemes visible (national + west_yorkshire + leeds).

    Regional schemes (West Yorkshire):
      - AD:VENTURE: not_suitable — over 3-yr trading age knockout
      - WY Growth Fund: strong_match — £67k revenue ≥ £50k; premises/hire goals align
      - Creative Places: not_suitable — hospitality sector fails creative/digital knockout
      - Business Enterprise Fund: strong_match — WY location, 3+ yrs, premises/hire goals
    Regional schemes (Leeds):
      - Leeds City Council Grants: strong_match — Leeds location + premises/hire goals
      - Business & IP Centre Leeds: possible — Leeds met but goals miss research/marketing focus

    National schemes:
      - Start Up Loans: not_suitable — over 3-yr trading age knockout
      - Help to Grow: Digital: possible — eligibility rules met but goals (premises/hire) miss digital focus
      - Help to Grow: Management: not_suitable — 3 employees fails 5+ headcount knockout
      - King's Trust Enterprise: possible — owner age not captured; knockout unverifiable
      - Innovate UK R&D Grants: possible — R&D activity cannot be automatically verified
      - R&D Tax Relief: possible — limited company qualifies but R&D activity unknown
    """
    results = run_match("profile-breadbloom-001", companies, schemes)
    by_id = {r.scheme_id: r for r in results}

    # West Yorkshire schemes
    assert by_id["ad-venture-grant"].fit == "not_suitable", \
        "3.2 yrs trading — AD:VENTURE requires under 3 yrs"
    assert by_id["wy-growth-fund"].fit == "strong_match", \
        "£67k revenue ≥ £50k, premises/hire goals match — strong fit"
    assert by_id["creative-places-growth-fund"].fit == "not_suitable", \
        "Hospitality sector — Creative Places requires creative/digital/technology"
    assert by_id["business-enterprise-fund"].fit == "strong_match", \
        "WY location, 3+ yrs trading, premises/hire goals align with fund keywords"

    # Leeds schemes
    assert by_id["leeds-city-council-grants"].fit == "strong_match", \
        "Based in Leeds + premises/hire goals match — strong fit"
    assert by_id["business-ip-centre-leeds"].fit == "possible", \
        "Leeds location met but premises/hire/training goals miss centre's focus"

    # National schemes
    assert by_id["start-up-loans"].fit == "not_suitable", \
        "3.2 yrs trading — Start Up Loans requires under 3 yrs"
    assert by_id["help-to-grow-digital"].fit == "possible", \
        "Eligibility rules cleared but goals (premises/hire) don't match digital focus"
    assert by_id["help-to-grow-management"].fit == "not_suitable", \
        "3 employees — Help to Grow: Management requires 5+"
    assert by_id["kings-trust-enterprise"].fit == "possible", \
        "Owner age not captured — age knockout cannot be verified"
    assert by_id["innovate-uk-rd-grants"].fit == "possible", \
        "R&D activity not in data model — always possible for any business"
    assert by_id["rd-tax-relief"].fit == "possible", \
        "Limited company clears structure knockout; R&D activity unknown"


def test_movefit_national_schemes_only(companies, schemes):
    """
    MoveFit Leeds (profile-movefit-001) — sole_trader, health_and_fitness,
    no postcode (HMRC-only), £18,500, trading from Sep 2024 (~1.7 yrs at May 2026).
    No postcode → only national schemes returned (6 schemes total).

    - Start Up Loans: strong_match — under 3 yrs trading, equipment goals align
    - Help to Grow: Digital: possible — clears 12-month gate but employee count unknown (no PAYE)
    - Help to Grow: Management: possible — clears 12-month gate but employee count unknown (no PAYE)
    - King's Trust Enterprise: possible — owner age not captured; knockout unverifiable
    - Innovate UK R&D Grants: possible — R&D activity cannot be automatically verified
    - R&D Tax Relief: not_suitable — sole trader fails limited company knockout
    """
    results = run_match("profile-movefit-001", companies, schemes)
    by_id = {r.scheme_id: r for r in results}

    assert set(by_id.keys()) == {
        "start-up-loans", "help-to-grow-digital", "help-to-grow-management",
        "kings-trust-enterprise", "innovate-uk-rd-grants", "rd-tax-relief",
    }, "No postcode — only national schemes should be returned"

    assert by_id["start-up-loans"].fit == "strong_match", \
        "Under 3 yrs trading, equipment goals match — strong fit"
    assert by_id["help-to-grow-digital"].fit == "possible", \
        "Clears 12-month trading gate but employee count unknown (no PAYE data)"
    assert by_id["help-to-grow-management"].fit == "possible", \
        "Clears 12-month trading gate but employee count unknown (no PAYE data)"
    assert by_id["kings-trust-enterprise"].fit == "possible", \
        "Owner age not captured — age knockout cannot be verified"
    assert by_id["innovate-uk-rd-grants"].fit == "possible", \
        "R&D activity not in data model — always possible for any business"
    assert by_id["rd-tax-relief"].fit == "not_suitable", \
        "Sole trader — R&D Tax Relief requires a limited company"


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
