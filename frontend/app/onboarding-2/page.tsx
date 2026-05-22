"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ArrowRight, Mic, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import { fetchBusinessProfile, updateBusinessProfile } from "@/lib/business-api"
import { useProfile } from "@/lib/profile-context"

const MOCK_VOICE_TRANSCRIPTS: Record<string, Record<string, string>> = {
  "profile-northlight-001": {
    growth:
      "I'm getting more clients than I can handle on my own. I want to hire a junior designer and move into a co-working space so I can take on bigger branding projects.",
    funding:
      "About £3k for Adobe Creative Cloud and some design tools, maybe £2k for a proper portfolio site, and the rest for marketing. Total around £5-6k.",
    constraints:
      "I'd prefer not to take on a loan right now — I'm still building up cash reserves. Grants would be ideal.",
  },
  "profile-breadbloom-001": {
    growth:
      "We've got a waiting list for tables every weekend. We need to knock through to the space next door and add 12 more seats, plus upgrade the coffee machine.",
    funding:
      "£15k for the lease extension and building work, £8k for a new espresso machine and grinder, and £2k for staff training. Total around £25k.",
    constraints:
      "We can do a loan if needed, especially since this expansion will pay for itself quickly. Need the money in the next 2-3 months.",
  },
  "profile-movefit-001": {
    growth:
      "I want to build an online coaching platform so I'm not just trading hours for money. Maybe film workout videos and sell monthly subscriptions.",
    funding:
      "£2k for equipment — kettlebells, resistance bands, yoga mats. £500 for insurance and £1k for Facebook ads. Total around £3.5k.",
    constraints:
      "I'm only 6 months in, so I don't know if banks would lend to me yet. I'm okay with smaller amounts if they're easier to get.",
  },
}

const DEFAULT_VOICE_TRANSCRIPTS: Record<string, string> = {
  growth:
    "We want to grow revenue over the next year by expanding our customer base and improving our core product offering.",
  funding:
    "We're looking for around £10,000 to cover equipment, marketing, and working capital for the next few months.",
  constraints:
    "We'd prefer grant funding if possible, and we'd like to receive funds within the next six months.",
}

const VOICE_MOCK_DELAY_MS = 1400

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
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current)
      }
    }
  }, [])

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

  const getMockTranscript = (sectionId: string) =>
    MOCK_VOICE_TRANSCRIPTS[active.profile_id]?.[sectionId] ??
    DEFAULT_VOICE_TRANSCRIPTS[sectionId]

  const stopVoiceInput = () => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current)
      voiceTimeoutRef.current = null
    }
    setRecordingId(null)
  }

  const toggleVoiceInput = (sectionId: string) => {
    if (loading || saving) return

    if (recordingId === sectionId) {
      stopVoiceInput()
      return
    }

    stopVoiceInput()
    setRecordingId(sectionId)

    voiceTimeoutRef.current = setTimeout(() => {
      const transcript = getMockTranscript(sectionId)
      setValues((prev) => {
        const current = prev[sectionId]?.trim()
        return {
          ...prev,
          [sectionId]: current ? `${current} ${transcript}` : transcript,
        }
      })
      setRecordingId(null)
      voiceTimeoutRef.current = null
    }, VOICE_MOCK_DELAY_MS)
  }

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
              <div className="rounded-2xl border border-[#F4D7E5] bg-[#FCF5F8] overflow-hidden focus-within:border-foreground transition-colors">
                <textarea
                  value={values[section.id]}
                  onChange={(e) => update(section.id, e.target.value)}
                  placeholder={section.placeholder}
                  rows={3}
                  disabled={recordingId === section.id}
                  className="w-full bg-transparent p-4 text-base text-foreground placeholder:text-muted-foreground resize-none focus:outline-none disabled:opacity-80"
                />
                <div className="flex items-center justify-end gap-2 border-t border-[#F4D7E5] bg-[#FCF5F8] px-3 py-2">
                  {recordingId === section.id ? (
                    <span className="mr-auto flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                      Listening…
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleVoiceInput(section.id)}
                    disabled={loading || saving || (recordingId != null && recordingId !== section.id)}
                    aria-label={
                      recordingId === section.id
                        ? `Stop voice input for ${section.label}`
                        : `Start voice input for ${section.label}`
                    }
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                      recordingId === section.id
                        ? "bg-foreground text-white"
                        : "bg-[#F4D7E5] text-foreground hover:bg-[#efc4d8]"
                    }`}
                  >
                    {recordingId === section.id ? (
                      <Square className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
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
