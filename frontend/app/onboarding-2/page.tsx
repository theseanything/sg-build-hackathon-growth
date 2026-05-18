"use client"

import { useState } from "react"
import { ChevronLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProfile } from "@/lib/profile-context"

const sections = [
  {
    id: "growth",
    label: "Growth Goal",
    placeholder: "What are you trying to grow or change?",
    defaultValue: "We've got a waiting list for tables every weekend. We need to knock through to the space next door and add 12 more seats, plus upgrade the coffee machine.",
  },
  {
    id: "funding",
    label: "Funding Need",
    placeholder: "How much do you need and what for?",
    defaultValue: "£15k for the lease extension and building work, £8k for a new espresso machine and grinder, and £2k for staff training. Total around £25k.",
  },
  {
    id: "constraints",
    label: "Constraints",
    placeholder: "Any timing or type preferences?",
    defaultValue: "We can do a loan if needed, especially since this expansion will pay for itself quickly. Need the money in the next 2-3 months.",
  },
]

export default function Onboarding2Page() {
  const router = useRouter()
  const { active } = useProfile()
  const name = active.user_provided.trading_name
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(sections.map((s) => [s.id, ""]))
  )

  const update = (id: string, val: string) =>
    setValues((prev) => ({ ...prev, [id]: val }))

  return (
    <div className="h-full bg-white flex flex-col px-6 pt-12 overflow-hidden">
      {/* Back button */}
      <button onClick={() => router.push("/onboarding-1-playback")} className="w-10 h-10 rounded-full bg-[#F4D7E5] flex items-center justify-center mb-8 self-start flex-shrink-0">
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>

      {/* Progress bar */}
      <div className="flex gap-2 mb-8 flex-shrink-0">
        <div className="h-1 flex-1 rounded-full bg-foreground" />
        <div className="h-1 flex-1 rounded-full bg-foreground" />
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-semibold text-foreground tracking-tight leading-snug mb-8 flex-shrink-0">
        Tell us about<br />{name}'s<br />upcoming ambitions.
      </h1>

      {/* Sections */}
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
        {sections.map((section) => (
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
        ))}
      </div>

      {/* Confirm button */}
      <button onClick={() => router.push("/interstitial?next=/dashboard")} className="mt-6 mb-[calc(1.5rem+env(safe-area-inset-bottom))] w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 flex-shrink-0">
        Confirm
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
