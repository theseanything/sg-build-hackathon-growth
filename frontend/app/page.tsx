"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { LogoBar } from "@/components/logo-bar"
import { useProfile } from "@/lib/profile-context"

const partners = ["GOV.UK", "Companies House", "HMRC"]

type AuthMode = "login" | "signup"
type MockAction = "email-login" | "govuk-login" | "signup"

export default function HomePage() {
  const router = useRouter()
  const { active, setActive } = useProfile()
  const [mode, setMode] = useState<AuthMode>("login")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [loadingAction, setLoadingAction] = useState<MockAction | null>(null)

  const isLoading = loadingAction !== null

  const completeMockAuth = (action: MockAction) => {
    setLoadingAction(action)

    if (action === "signup" && businessName.trim()) {
      const trimmedBusinessName = businessName.trim()
      setActive({
        ...active,
        profile_id: "profile-mock-signup",
        gov_uk_one_login: {
          ...active.gov_uk_one_login,
          email: signupEmail,
          created_at: new Date().toISOString(),
        },
        user_provided: {
          ...active.user_provided,
          trading_name: trimmedBusinessName,
        },
        companies_house: {
          ...active.companies_house,
          legal_name: `${trimmedBusinessName} Ltd`,
        },
      })
    }

    window.setTimeout(() => {
      router.push("/onboarding")
    }, 800)
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    completeMockAuth("email-login")
  }

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    completeMockAuth("signup")
  }

  return (
    <div className="min-h-full bg-white flex flex-col px-6 pt-12 pb-8">
      <div className="mb-10">
        <LogoBar />
      </div>

      <div className="mb-7">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Business funding made simpler
        </p>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight leading-snug mb-4">
          Welcome to<br />FundingFit.
        </h1>
        <p className="text-base font-normal text-muted-foreground leading-relaxed">
          We use government data to match you with opportunities to grow your business.
        </p>
      </div>

      <div className="flex rounded-2xl bg-[#FCF5F8] border border-[#F4D7E5] p-1 mb-5">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            mode === "login" ? "bg-foreground text-white" : "text-muted-foreground"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            mode === "signup" ? "bg-foreground text-white" : "text-muted-foreground"
          }`}
        >
          Sign up
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="mt-2 w-full rounded-2xl border border-[#F4D7E5] bg-white px-4 py-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Enter your password"
              required
              className="mt-2 w-full rounded-2xl border border-[#F4D7E5] bg-white px-4 py-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 disabled:opacity-60"
          >
            {loadingAction === "email-login" ? "Logging in..." : "Log in with email"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => completeMockAuth("govuk-login")}
            className="w-full border border-foreground/20 bg-white text-foreground font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Log in with GOV.UK OneLogin
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label htmlFor="business-name" className="text-sm font-medium text-foreground">
              Business name
            </label>
            <input
              id="business-name"
              type="text"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Northlight Studio"
              required
              className="mt-2 w-full rounded-2xl border border-[#F4D7E5] bg-white px-4 py-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              placeholder="founder@example.com"
              required
              className="mt-2 w-full rounded-2xl border border-[#F4D7E5] bg-white px-4 py-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              placeholder="Create a password"
              required
              className="mt-2 w-full rounded-2xl border border-[#F4D7E5] bg-white px-4 py-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 disabled:opacity-60"
          >
            {loadingAction === "signup" ? "Creating account..." : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="mt-8 flex-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
            We work with
          </p>
          <div className="flex gap-3">
            {partners.map((p) => (
              <span
                key={p}
                className="px-3 py-1.5 rounded-full border border-[#F4D7E5] bg-[#FCF5F8] text-xs font-medium text-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
