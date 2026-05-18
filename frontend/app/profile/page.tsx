"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  fetchBusinessProfile,
  mergeBusinessProfileIntoCompany,
  updateBusinessProfile,
  type BusinessProfile,
} from "@/lib/business-api"
import { useProfile } from "@/lib/profile-context"

function formatText(value?: string) {
  if (!value) {
    return "—"
  }

  return value.replace(/_/g, " ")
}

function formatCurrency(value?: number | null) {
  return value == null ? "—" : `£${value.toLocaleString()}`
}

function parseOptionalInt(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseOptionalFloat(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number.parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

export default function ProfilePage() {
  const router = useRouter()
  const { active, setActive } = useProfile()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [ownerAge, setOwnerAge] = useState("")
  const [employeeCount, setEmployeeCount] = useState("")
  const [annualRevenue, setAnnualRevenue] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      setLoading(true)
      setError(null)
      setSaveMessage(null)

      try {
        const businessProfile = await fetchBusinessProfile(active.profile_id)

        if (!cancelled) {
          setProfile(businessProfile)
          setOwnerAge(
            businessProfile.owner_age == null ? "" : String(businessProfile.owner_age),
          )
          setEmployeeCount(
            businessProfile.employee_count == null
              ? ""
              : String(businessProfile.employee_count),
          )
          setAnnualRevenue(
            businessProfile.annual_revenue == null
              ? ""
              : String(businessProfile.annual_revenue),
          )
        }
      } catch (loadError) {
        if (!cancelled) {
          setProfile(null)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load business profile",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [active.profile_id])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaveMessage(null)

    try {
      const updatedProfile = await updateBusinessProfile(active.profile_id, {
        owner_age: parseOptionalInt(ownerAge),
        employee_count: parseOptionalInt(employeeCount),
        annual_revenue: parseOptionalFloat(annualRevenue),
      })

      setProfile(updatedProfile)
      setOwnerAge(updatedProfile.owner_age == null ? "" : String(updatedProfile.owner_age))
      setEmployeeCount(
        updatedProfile.employee_count == null ? "" : String(updatedProfile.employee_count),
      )
      setAnnualRevenue(
        updatedProfile.annual_revenue == null ? "" : String(updatedProfile.annual_revenue),
      )
      setActive(
        mergeBusinessProfileIntoCompany(active, updatedProfile, active.profile_id),
      )
      setSaveMessage("Profile saved")
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save business profile",
      )
    } finally {
      setSaving(false)
    }
  }

  const readOnlyRows = profile
    ? [
        { label: "Business name", value: profile.business_name },
        { label: "Trading status", value: formatText(profile.trading_status) },
        { label: "Registration date", value: profile.registration_date || "—" },
        { label: "Sector", value: formatText(profile.sector) },
        { label: "Postcode", value: profile.postcode || "—" },
        { label: "Companies House ID", value: profile.companies_house_id ?? "—" },
      ]
    : []

  return (
    <div className="h-full bg-white overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between px-6 pt-12 pb-2">
        <span className="text-xl font-black tracking-tight text-foreground">
          Funding<span className="text-accent">Fit</span>
        </span>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to dashboard
        </button>
      </div>

      <header className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Business profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update details used for funding matches.
        </p>
      </header>

      <div className="px-6 space-y-6">
        {loading ? (
          <p className="rounded-xl bg-[#FCF5F8] border border-[#F4D7E5] px-4 py-3 text-sm text-muted-foreground">
            Loading profile...
          </p>
        ) : error && !profile ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : profile ? (
          <>
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                From connected sources
              </h2>
              <div className="flex flex-col gap-2">
                {readOnlyRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between px-4 py-3 bg-[#FCF5F8] border border-[#F4D7E5] rounded-xl gap-4"
                  >
                    <span className="text-sm text-muted-foreground flex-shrink-0">
                      {row.label}
                    </span>
                    <span className="text-sm font-medium text-foreground text-right capitalize">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Editable details
              </h2>

              <div className="space-y-2">
                <Label htmlFor="owner-age">Owner age</Label>
                <Input
                  id="owner-age"
                  type="number"
                  min={16}
                  max={120}
                  inputMode="numeric"
                  value={ownerAge}
                  onChange={(event) => setOwnerAge(event.target.value)}
                  placeholder="e.g. 42"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-count">Employees on payroll</Label>
                <Input
                  id="employee-count"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={employeeCount}
                  onChange={(event) => setEmployeeCount(event.target.value)}
                  placeholder="e.g. 12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual-revenue">Annual turnover (£)</Label>
                <Input
                  id="annual-revenue"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={annualRevenue}
                  onChange={(event) => setAnnualRevenue(event.target.value)}
                  placeholder="e.g. 850000"
                />
                {profile.annual_revenue != null && (
                  <p className="text-xs text-muted-foreground">
                    Current: {formatCurrency(profile.annual_revenue)}
                  </p>
                )}
              </div>

              {error ? (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              {saveMessage ? (
                <p className="text-sm text-emerald-700">{saveMessage}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </>
        ) : null}
      </div>

      <BottomNav />
    </div>
  )
}
