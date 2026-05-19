"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { fetchBusinessProfile, updateBusinessProfile } from "@/lib/business-api"
import { useProfile } from "@/lib/profile-context"

const sections = [
  {
    id: "growth",
    label: "Growth Goal",
    placeholder: "What are you trying to grow or change?",
  },
  {
    id: "funding",
    label: "Funding Need",
    placeholder: "How much do you need and what for?",
  },
  {
    id: "constraints",
    label: "Constraints",
    placeholder: "Any timing or type preferences?",
  },
]

const emptyValues = Object.fromEntries(sections.map((s) => [s.id, ""]))

export default function Onboarding2Page() {
  const router = useRouter()
  const { active } = useProfile()
  const name = active.user_provided.trading_name
  const [values, setValues] = useState<Record<string, string>>(emptyValues)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadGoals() {
      setLoading(true)
      setError(null)

      try {
        const profile = await fetchBusinessProfile(active.profile_id)

        if (!cancelled) {
          setValues({
            growth: profile.growth_goal ?? "",
            funding: profile.funding_goal ?? "",
            constraints: profile.constraints ?? "",
          })
        }
      } catch (fetchError) {
        console.error("[onboarding-2]", "Failed to load business goals", {
          profileId: active.profile_id,
          error: fetchError,
        })

        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load your goals",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadGoals()

    return () => {
      cancelled = true
    }
  }, [active.profile_id])

  const update = (id: string, val: string) =>
    setValues((prev) => ({ ...prev, [id]: val }))

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)

    try {
      await updateBusinessProfile(active.profile_id, {
        growth_goal: values.growth,
        funding_goal: values.funding,
        constraints: values.constraints,
      })
      router.push("/interstitial?next=/dashboard")
    } catch (saveError) {
      console.error("[onboarding-2]", "Failed to save business goals", {
        profileId: active.profile_id,
        error: saveError,
      })
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save your goals",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full bg-white flex flex-col px-6 pt-12 overflow-hidden">
      <button onClick={() => router.push("/onboarding-1-playback")} className="w-10 h-10 rounded-full bg-[#F4D7E5] flex items-center justify-center mb-8 self-start flex-shrink-0">
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>

      <div className="flex gap-2 mb-8 flex-shrink-0">
        <div className="h-1 flex-1 rounded-full bg-foreground" />
        <div className="h-1 flex-1 rounded-full bg-foreground" />
      </div>

      <h1 className="text-3xl font-semibold text-foreground tracking-tight leading-snug mb-8 flex-shrink-0">
        Tell us about<br />{name}'s<br />upcoming ambitions.
      </h1>

      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <p className="rounded-xl bg-[#FCF5F8] border border-[#F4D7E5] px-4 py-3 text-sm text-muted-foreground">
            Loading your goals...
          </p>
        ) : (
          sections.map((section) => (
            <div key={section.id}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {section.label}
              </p>
              <textarea
                value={values[section.id]}
                onChange={(e) => update(section.id, e.target.value)}
                placeholder={section.placeholder}
                rows={3}
                className="w-full bg-[#FCF5F8] border border-[#F4D7E5] rounded-2xl p-4 text-base text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
          ))
        )}
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <button
        disabled={loading || saving}
        onClick={() => void handleConfirm()}
        className="mt-6 mb-[calc(1.5rem+env(safe-area-inset-bottom))] w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 flex-shrink-0 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Confirm"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}