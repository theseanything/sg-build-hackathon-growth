type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getRecord(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null
  }

  const child = value[key]
  return isRecord(child) ? child : null
}

function getString(value: unknown, key: string) {
  if (!isRecord(value)) {
    return ""
  }

  const child = value[key]
  return typeof child === "string" ? child : ""
}

function getNullableNumber(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null
  }

  const child = value[key]
  return typeof child === "number" ? child : null
}

function getStringArray(value: unknown, key: string) {
  if (!isRecord(value) || !Array.isArray(value[key])) {
    return []
  }

  return value[key].filter((item): item is string => typeof item === "string")
}

export function toBusinessProfile(profile: unknown) {
  const userProvided = getRecord(profile, "user_provided")
  const companiesHouse = getRecord(profile, "companies_house")
  const hmrc = getRecord(profile, "hmrc")
  const derived = getRecord(profile, "derived")
  const address = getRecord(companiesHouse, "registered_office_address")
  const selfAssessment = getRecord(hmrc, "self_assessment")
  const paye = getRecord(hmrc, "paye")
  const goals = isRecord(profile) && Array.isArray(profile.goals) ? profile.goals : []
  const latestGoal = goals.at(-1)
  const extracted = getRecord(latestGoal, "extracted")

  return {
    business_name:
      getString(userProvided, "trading_name") ||
      getString(companiesHouse, "legal_name"),
    trading_status:
      getString(derived, "legal_structure") ||
      getString(hmrc, "legal_structure") ||
      getString(companiesHouse, "company_type"),
    registration_date:
      getString(companiesHouse, "incorporation_date") ||
      getString(selfAssessment, "trading_start_date"),
    sector:
      getString(derived, "sector") ||
      getStringArray(companiesHouse, "sic_descriptions")[0] ||
      "",
    postcode: getString(address, "postal_code"),
    employee_count: getNullableNumber(paye, "employees_on_payroll"),
    annual_revenue: getNullableNumber(selfAssessment, "turnover"),
    goals: getStringArray(extracted, "intended_spend"),
    data_sources: [
      ...(companiesHouse ? ["Companies House"] : []),
      ...(hmrc ? ["HMRC"] : []),
    ],
    companies_house_id:
      getString(companiesHouse, "company_number") ||
      getString(profile, "profile_id") ||
      null,
    owner_age: getNullableNumber(userProvided, "owner_age"),
    has_rd_activity: null,
    funding_needed: getNullableNumber(extracted, "funding_amount"),
  }
}
