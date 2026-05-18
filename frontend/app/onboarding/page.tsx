"use client"

import { useState } from "react"
import { ChevronLeft, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProfile } from "@/lib/profile-context"

const services = [
  { id: "govuk", name: "GOV.UK", description: "Government services & guidance" },
  { id: "companies-house", name: "Companies House", description: "Company registration & filings" },
  { id: "hmrc", name: "HMRC", description: "Tax, VAT & payroll records" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { active } = useProfile()
  const name = active.user_provided.trading_name
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-full bg-white flex flex-col px-6 pt-12 pb-8">
      <button
        onClick={() => router.push("/")}
        className="w-10 h-10 rounded-full bg-[#F4D7E5] flex items-center justify-center mb-8 self-start"
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>

      <div className="flex gap-2 mb-8">
        <div className="h-1 flex-1 rounded-full bg-foreground" />
        <div className="h-1 flex-1 rounded-full bg-[#F4D7E5]" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
        Help us know more about {name}.
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Tap to connect with following services
      </p>

      <div className="flex flex-col gap-3 flex-1">
        {services.map((service) => {
          const isSelected = selected.includes(service.id)
          return (
            <button
              key={service.id}
              onClick={() => toggle(service.id)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${
                isSelected ? "border-foreground bg-[#FCF5F8]" : "border-[#F4D7E5] bg-[#FCF5F8]"
              }`}
            >
              <div>
                <p className="font-medium text-foreground text-sm">{service.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? "bg-foreground border-foreground" : "border-[#F4D7E5] bg-white"
              }`}>
                {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => router.push("/interstitial?next=/onboarding-1-playback")}
        className="mt-8 w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm"
      >
        Proceed
      </button>
    </div>
  )
}
