"use client"

import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProfile } from "@/lib/profile-context"

export default function LoginPage() {
  const router = useRouter()
  const { active } = useProfile()
  const name = active.user_provided.trading_name

  return (
    <div className="h-full bg-white flex flex-col px-6 pt-16 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-16">
        <span className="text-xl font-black tracking-tight text-foreground">
          Funding<span className="text-accent">Fit</span>
        </span>
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight leading-snug mb-6">
          Are you {name}?
        </h1>
        <p className="text-base font-normal text-muted-foreground leading-relaxed">
          We need 10 minutes of your time to get the right information about your business and your ambitions.
        </p>
      </div>

      <button
        onClick={() => router.push("/onboarding")}
        className="w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6"
      >
        Continue as {name}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
