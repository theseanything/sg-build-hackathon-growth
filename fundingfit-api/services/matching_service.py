from datetime import date, datetime
from typing import Optional

from models.business import BusinessProfile
from models.scheme import SchemeResult
from services.schemes_service import infer_region

# ── sector normalization ──────────────────────────────────────────────────────

_SECTOR_MAP: dict[str, list[str]] = {
    "creative": ["creative", "art", "design", "film", "music", "media", "theatre",
                 "photography", "animation", "publishing", "broadcast", "production"],
    "digital": ["digital", "software", "web", "app", "saas", "platform",
                "internet", "cyber", "data", "ai ", "machine learning", "ecommerce"],
    "technology": ["technology", "tech", "engineering", "hardware", "electronics",
                   "robotics", "manufacturing", "automation"],
    "science": ["science", "scientific", "research", "laboratory", "biotech",
                "pharmaceutical", "medical", "health", "clinical"],
    "professional_services": ["consulting", "consultancy", "legal", "accounti",
                              "finance", "insurance", "management", "advisory"],
    "retail": ["retail", "shop", "store", "wholesale", "distribution"],
    "hospitality": ["hotel", "restaurant", "food", "catering", "hospitality",
                    "accommodation", "tourism", "events"],
    "construction": ["construction", "building", "property", "architecture",
                     "civil engineering", "surveying"],
}

_GOAL_MAP: dict[str, list[str]] = {
    "equipment":       ["equipment", "machinery", "tools", "hardware", "asset", "vehicle"],
    "software":        ["software", "digital tool", "crm", "accounting",
                        "productivity", "saas", "subscription"],
    "marketing":       ["marketing", "advertis", "brand", "website", "social media",
                        "seo", "pr ", "promotion"],
    "hire":            ["hire", "recruit", "staff", "employ", "headcount", "team"],
    "growth":          ["grow", "growth", "scale", "expand", "expansion", "revenue"],
    "export":          ["export", "international", "overseas", "global"],
    "research":        ["research", "r&d", "develop", "innovation", "innovate",
                        "novel", "prototype"],
    "premises":        ["premises", "office", "warehouse", "shop", "location", "lease",
                        "refurbish"],
    "working_capital": ["working capital", "cash flow", "cashflow", "operational"],
    "training":        ["training", "upskill", "course", "leadership", "management"],
}


def _sector_tags(sector: str) -> set[str]:
    s = sector.lower()
    return {tag for tag, keywords in _SECTOR_MAP.items() if any(k in s for k in keywords)}


def _goal_tags(goals: list[str]) -> set[str]:
    combined = " ".join(goals).lower()
    return {tag for tag, keywords in _GOAL_MAP.items() if any(k in combined for k in keywords)}


def _business_spend_items(business: BusinessProfile) -> list[str]:
    return [
        s
        for g in business.goals
        if g.extracted
        for s in g.extracted.intended_spend
    ]


# ── trading age ───────────────────────────────────────────────────────────────

def _trading_age_years(registration_date: str) -> float:
    try:
        if len(registration_date) == 7:
            registration_date += "-01"
        reg = datetime.strptime(registration_date, "%Y-%m-%d").date()
        return (date.today() - reg).days / 365.25
    except ValueError:
        return 0.0


# ── rule evaluation ───────────────────────────────────────────────────────────

def _apply_op(op: str, profile_val, rule_val) -> bool:
    if op == "lt":     return profile_val < rule_val
    if op == "lte":    return profile_val <= rule_val
    if op == "gt":     return profile_val > rule_val
    if op == "gte":    return profile_val >= rule_val
    if op == "eq":     return profile_val == rule_val
    if op == "in":     return profile_val in rule_val
    if op == "not_in": return profile_val not in rule_val
    if op == "any_in": return bool(set(profile_val) & set(rule_val))
    return False


def _evaluate_rule(
    rule: dict,
    business: BusinessProfile,
    sector_tags: set[str],
) -> Optional[bool]:
    field = rule["field"]
    op    = rule["operator"]
    val   = rule["value"]

    if field == "trading_age_years":
        reg_date = None
        if business.companies_house and business.companies_house.incorporation_date:
            reg_date = business.companies_house.incorporation_date
        elif (business.hmrc and business.hmrc.self_assessment
              and business.hmrc.self_assessment.trading_start_date):
            reg_date = business.hmrc.self_assessment.trading_start_date
        return None if reg_date is None else _apply_op(op, _trading_age_years(reg_date), val)

    if field == "employee_count":
        count = (
            business.hmrc.paye.employees_on_payroll
            if business.hmrc and business.hmrc.paye
            else None
        )
        return None if count is None else _apply_op(op, count, val)

    if field == "annual_revenue":
        revenue = (
            business.hmrc.self_assessment.turnover
            if business.hmrc and business.hmrc.self_assessment
            else None
        )
        return None if revenue is None else _apply_op(op, revenue, val)

    if field == "trading_status":
        status = business.derived.legal_structure if business.derived else ""
        return _apply_op(op, status, val)

    if field == "sector":
        if not sector_tags:
            return None
        return _apply_op("any_in", sector_tags, val)

    if field == "has_rd_activity":
        return None

    if field == "owner_age":
        age = business.user_provided.owner_age if business.user_provided else None
        return None if age is None else _apply_op(op, age, val)

    if field == "funding_needed":
        return None

    return None


# ── keyword scoring ───────────────────────────────────────────────────────────

def _keyword_score(
    business: BusinessProfile, tags: dict, sector_tags: set[str]
) -> float:
    scheme_sectors = set(tags.get("sectors", []))
    scheme_goals   = set(tags.get("goals", []))

    if not scheme_sectors and not scheme_goals:
        return 1.0

    scores: list[float] = []
    if scheme_sectors:
        scores.append(1.0 if scheme_sectors & sector_tags else 0.0)
    if scheme_goals:
        scores.append(1.0 if scheme_goals & _goal_tags(_business_spend_items(business)) else 0.0)

    return sum(scores) / len(scores)


# ── fit reason templating ─────────────────────────────────────────────────────

def _fit_reason(
    fit: str,
    met: list[str],
    unmet: list[str],
    uncertain: list[str],
) -> str:
    if fit == "not_suitable":
        first = unmet[0].lower() if unmet else "key eligibility criteria"
        return f"Not eligible: {first}."
    if fit == "strong_match":
        highlights = met[:2]
        joined = " and ".join(h.lower() for h in highlights)
        return f"Strong fit — meets key criteria: {joined}." if joined else "Meets all assessed eligibility criteria."
    # possible
    if uncertain:
        return f"Potentially eligible — {uncertain[0].lower()} could not be automatically verified."
    if unmet:
        return f"May be eligible but does not fully meet: {unmet[0].lower()}."
    return "Potentially eligible — some criteria require manual confirmation."


# ── main entry point ──────────────────────────────────────────────────────────

def match_scheme(business: BusinessProfile, scheme: dict) -> SchemeResult:
    sector_tags = _sector_tags(business.derived.sector if business.derived else "")
    rules       = scheme.get("rules", [])
    tags        = scheme.get("tags", {})

    met:       list[str] = []
    unmet:     list[str] = []
    uncertain: list[str] = []
    hard_fail            = False

    for rule in rules:
        result      = _evaluate_rule(rule, business, sector_tags)
        label       = rule["label"]
        is_knockout = rule.get("knockout", True)

        if result is None:
            uncertain.append(label)
        elif result:
            met.append(label)
        else:
            unmet.append(label)
            if is_knockout:
                hard_fail = True

    if hard_fail:
        fit = "not_suitable"
    elif uncertain:
        fit = "possible"
    else:
        score      = _keyword_score(business, tags, sector_tags)
        soft_fails = [u for u in unmet]
        fit = "strong_match" if score >= 0.5 and not soft_fails else "possible"

    return SchemeResult(
        scheme_id=scheme["id"],
        name=scheme["name"],
        provider=scheme["provider"],
        region=infer_region(scheme),
        funding_display=scheme.get("funding", {}).get("display", ""),
        effort_hours=scheme.get("effort", {}).get("hours", 0),
        fit=fit,
        fit_reason=_fit_reason(fit, met, unmet, uncertain),
        plain_english_summary=scheme.get("summary", ""),
        eligibility_met=met,
        eligibility_unmet=unmet + [f"{u} — needs confirming" for u in uncertain],
        url=scheme.get("url", ""),
    )


async def match_all(business: BusinessProfile, schemes: list[dict]) -> list[SchemeResult]:
    import asyncio
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, match_scheme, business, s) for s in schemes]
    return list(await asyncio.gather(*tasks))
