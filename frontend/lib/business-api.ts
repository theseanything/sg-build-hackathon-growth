import type { Company } from "@/lib/profile-context"

export const MOCK_ONE_LOGIN_PROFILE_ID = "profile-northlight-001"
export const DEMO_LOGIN_PROFILE_IDS = {
  breadbloom: "profile-breadbloom-001",
  movefit: "profile-movefit-001",
} as const

export function getProfileIdForDemoUsername(username: string) {
  const normalizedUsername = username.trim().toLowerCase()
  const profileId =
    DEMO_LOGIN_PROFILE_IDS[
      normalizedUsername as keyof typeof DEMO_LOGIN_PROFILE_IDS
    ]

  return profileId ?? null
}

export interface BusinessProfile {
  business_name: string
  trading_status: string
  registration_date: string
  sector: string
  postcode: string
  employee_count?: number | null
  annual_revenue?: number | null
  goals: string[]
  data_sources: string[]
  companies_house_id?: string | null
  owner_age?: number | null
  has_rd_activity?: boolean | null
  funding_needed?: number | null
}

export type SchemeFit = "strong_match" | "possible" | "not_suitable"

export interface MatchedScheme {
  scheme_id: string
  name: string
  provider: string
  region: string
  funding_display: string
  effort_hours: number
  fit: SchemeFit
  fit_reason: string
  plain_english_summary: string
  eligibility_met: string[]
  eligibility_unmet: string[]
  url: string
}

function isErrorPayload(payload: unknown): payload is { detail: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "detail" in payload &&
    typeof (payload as { detail?: unknown }).detail === "string"
  )
}

export async function fetchBusinessProfile(profileId: string): Promise<BusinessProfile> {
  const response = await fetch("/api/business/api", {
    headers: {
      "X-Session-ID": profileId,
    },
    cache: "no-store",
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      isErrorPayload(payload) ? payload.detail : "Unable to load business profile",
    )
  }

  return payload as BusinessProfile
}

export interface BusinessProfileUpdate {
  owner_age?: number | null
  employee_count?: number | null
  annual_revenue?: number | null
}

export async function updateBusinessProfile(
  profileId: string,
  update: BusinessProfileUpdate,
): Promise<BusinessProfile> {
  const response = await fetch("/api/business/api", {
    method: "PATCH",
    headers: {
      "X-Session-ID": profileId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(update),
    cache: "no-store",
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      isErrorPayload(payload) ? payload.detail : "Unable to save business profile",
    )
  }

  return payload as BusinessProfile
}

export async function fetchMatchedSchemes(profileId: string): Promise<MatchedScheme[]> {
  const response = await fetch("/api/match", {
    method: "POST",
    headers: {
      "X-Session-ID": profileId,
    },
    cache: "no-store",
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      isErrorPayload(payload) ? payload.detail : "Unable to load matched schemes",
    )
  }

  return Array.isArray(payload) ? (payload as MatchedScheme[]) : []
}

export function mergeBusinessProfileIntoCompany(
  company: Company,
  profile: BusinessProfile,
  profileId: string,
): Company {
  const companiesHouse = company.companies_house
  const selfAssessment = company.hmrc.self_assessment
  const paye = company.hmrc.paye

  return {
    ...company,
    profile_id: profileId,
    user_provided: {
      ...company.user_provided,
      trading_name: profile.business_name || company.user_provided.trading_name,
      owner_age: profile.owner_age ?? company.user_provided.owner_age,
    },
    companies_house: companiesHouse
      ? {
          ...companiesHouse,
          company_number: profile.companies_house_id ?? companiesHouse.company_number,
          incorporation_date: profile.registration_date || companiesHouse.incorporation_date,
          registered_office_address: {
            ...companiesHouse.registered_office_address,
            postal_code: profile.postcode || companiesHouse.registered_office_address.postal_code,
          },
        }
      : companiesHouse,
    hmrc: {
      ...company.hmrc,
      legal_structure: profile.trading_status || company.hmrc.legal_structure,
      self_assessment:
        selfAssessment && profile.annual_revenue != null
          ? {
              ...selfAssessment,
              turnover: profile.annual_revenue,
            }
          : selfAssessment,
      paye:
        paye && profile.employee_count != null
          ? {
              ...paye,
              employees_on_payroll: profile.employee_count,
            }
          : paye,
    },
    derived: {
      ...company.derived,
      legal_structure: profile.trading_status || company.derived.legal_structure,
      sector: profile.sector || company.derived.sector,
    },
  } as Company
}
