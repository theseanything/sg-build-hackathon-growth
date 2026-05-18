"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { type BusinessProfile, fetchBusinessProfile } from "@/lib/business-api"
import { useProfile } from "@/lib/profile-context"

function formatText(value?: unknown) {
  if (value == null || value === "") {
    return "—"
  }

  return String(value).replace(/_/g, " ")
}

function formatCurrency(value?: number | null) {
  return value == null ? "—" : `£${value.toLocaleString()}`
}

function formatList(values?: unknown[]) {
  return values?.length ? values.map(formatText).join(", ") : "—"
}

export default function Onboarding1PlaybackPage() {
  const router = useRouter()
  const { active } = useProfile()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadBusinessProfile() {
      setLoading(true)
      setError(null)

      try {
        const businessProfile = await fetchBusinessProfile(active.profile_id)

        if (!cancelled) {
          setProfile(businessProfile)
        }
      } catch (fetchError) {
        console.error("[onboarding-1-playback]", "Failed to load business profile", {
          profileId: active.profile_id,
          error: fetchError,
        })

        if (!cancelled) {
          setProfile(null)
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load business profile",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadBusinessProfile()

    return () => {
      cancelled = true
    }
  }, [active.profile_id])

  const rows = profile
    ? [
        { label: "Business name", value: profile.business_name },
        { label: "Trading status", value: formatText(profile.trading_status) },
        { label: "Registration date", value: profile.registration_date || "—" },
        { label: "Sector", value: formatText(profile.sector) },
        { label: "Postcode", value: profile.postcode || "—" },
        { label: "Companies House ID", value: profile.companies_house_id ?? "—" },
        {
          label: "Employees on payroll",
          value: profile.employee_count == null ? "—" : String(profile.employee_count),
        },
        { label: "Annual turnover", value: formatCurrency(profile.annual_revenue) },
        { label: "Goals", value: formatList(profile.goals) },
        { label: "Data sources", value: formatList(profile.data_sources) },
        { label: "Owner age", value: profile.owner_age == null ? "—" : String(profile.owner_age) },
        {
          label: "R&D activity",
          value:
            profile.has_rd_activity == null
              ? "—"
              : profile.has_rd_activity
                ? "Yes"
                : "No",
        },
        { label: "Funding needed", value: formatCurrency(profile.funding_needed) },
      ]
    : []

  return (
    <div className="h-[844px] bg-white flex flex-col px-6 pt-12 pb-10 overflow-y-auto">
      <button
        onClick={() => router.push("/onboarding")}
        className="w-10 h-10 rounded-full bg-[#F4D7E5] flex items-center justify-center mb-8 self-start flex-shrink-0"
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>

      <h1 className="text-3xl font-semibold text-foreground tracking-tight leading-snug mb-8 flex-shrink-0">
        This is<br />{profile?.business_name ?? "your business"}<br />in a summary.
      </h1>

      <div className="flex flex-col gap-2 flex-1">
        {loading ? (
          <p className="rounded-xl bg-[#FCF5F8] border border-[#F4D7E5] px-4 py-3 text-sm text-muted-foreground">
            Loading company details...
          </p>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between px-4 py-3 bg-[#FCF5F8] border border-[#F4D7E5] rounded-xl gap-4"
            >
              <span className="text-sm text-muted-foreground flex-shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-foreground text-right capitalize">{row.value}</span>
            </div>
          ))
        )}
      </div>

      <button
        disabled={loading || !profile}
        onClick={() => router.push("/onboarding-2")}
        className="mt-6 w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 flex-shrink-0 disabled:opacity-60"
      >
        Looks right, continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
