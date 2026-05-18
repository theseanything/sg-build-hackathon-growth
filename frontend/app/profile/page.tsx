"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import {
  fetchBusinessProfile,
  updateBusinessProfile,
  type BusinessProfile,
} from "@/lib/business-api"
import { useProfile } from "@/lib/profile-context"

type FormState = {
  owner_age: string
  employee_count: string
  annual_revenue: string
}

function toFormState(profile: BusinessProfile): FormState {
  return {
    owner_age: profile.owner_age != null ? String(profile.owner_age) : "",
    employee_count: profile.employee_count != null ? String(profile.employee_count) : "",
    annual_revenue: profile.annual_revenue != null ? String(profile.annual_revenue) : "",
  }
}

function parseOptionalInt(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined
}

function parseOptionalNumber(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export default function ProfilePage() {
  const router = useRouter()
  const { active } = useProfile()
  const profileId = active.profile_id

  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [form, setForm] = useState<FormState>({
    owner_age: "",
    employee_count: "",
    annual_revenue: "",
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSaved(false)

    fetchBusinessProfile(profileId)
      .then((p) => {
        if (cancelled) return
        setProfile(p)
        setForm(toFormState(p))
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : "Unable to load profile")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [profileId])

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setSaveError(null)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return

    const owner_age = parseOptionalInt(form.owner_age)
    const employee_count = parseOptionalInt(form.employee_count)
    const annual_revenue = parseOptionalNumber(form.annual_revenue)

    if (
      owner_age === undefined ||
      employee_count === undefined ||
      annual_revenue === undefined
    ) {
      setSaveError("Please enter valid numbers.")
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await updateBusinessProfile(profileId, {
        owner_age,
        employee_count,
        annual_revenue,
      })
      setProfile(updated)
      setForm(toFormState(updated))
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save changes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full bg-white overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 px-6 pt-12 pb-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-xl font-black tracking-tight text-foreground">
          Funding<span className="text-accent">Fit</span>
        </span>
      </div>

      <header className="px-6 pt-6 pb-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Business profile
        </p>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {profile?.business_name || active.user_provided.trading_name}
        </h1>
      </header>

      {loading ? (
        <div className="px-6 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : loadError ? (
        <div className="px-6">
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
        </div>
      ) : profile ? (
        <form onSubmit={handleSave} className="px-6 space-y-6">
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              From Companies House &amp; HMRC
            </h2>
            <div className="space-y-3">
              <ReadOnlyField label="Trading status" value={profile.trading_status} />
              <ReadOnlyField label="Sector" value={profile.sector} />
              <ReadOnlyField label="Postcode" value={profile.postcode} />
              <ReadOnlyField
                label="Registration date"
                value={profile.registration_date}
              />
              {profile.companies_house_id ? (
                <ReadOnlyField
                  label="Companies House ID"
                  value={profile.companies_house_id}
                />
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Editable details
            </h2>
            <div className="space-y-4">
              <EditableField
                id="owner_age"
                label="Owner age"
                type="number"
                inputMode="numeric"
                value={form.owner_age}
                onChange={(v) => updateField("owner_age", v)}
                placeholder="e.g. 42"
              />
              <EditableField
                id="employee_count"
                label="Employees on payroll"
                type="number"
                inputMode="numeric"
                value={form.employee_count}
                onChange={(v) => updateField("employee_count", v)}
                placeholder="e.g. 7"
              />
              <EditableField
                id="annual_revenue"
                label="Annual revenue (£)"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.annual_revenue}
                onChange={(v) => updateField("annual_revenue", v)}
                placeholder="e.g. 250000"
              />
            </div>
          </section>

          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          ) : null}

          {saved ? (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4" /> Saved
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-center disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : null}

      <BottomNav />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground break-words">{value || "—"}</p>
    </div>
  )
}

type EditableFieldProps = {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  step?: string
  placeholder?: string
}

function EditableField({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  step,
  placeholder,
}: EditableFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
      />
    </div>
  )
}
