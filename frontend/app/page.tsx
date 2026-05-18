"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { LogoBar } from "@/components/logo-bar"
import {
  MOCK_ONE_LOGIN_PROFILE_ID,
  fetchBusinessProfile,
  getProfileIdForDemoUsername,
  mergeBusinessProfileIntoCompany,
} from "@/lib/business-api"
import { useProfile, type Company } from "@/lib/profile-context"

const partners = ["GOV.UK", "Companies House", "HMRC"]

type AuthMode = "login" | "signup"
type MockAction = "username-login" | "govuk-login" | "signup"

export default function HomePage() {
  const router = useRouter()
  const { active, setActive, companies } = useProfile()
  const [mode, setMode] = useState<AuthMode>("login")
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [loadingAction, setLoadingAction] = useState<MockAction | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const isLoading = loadingAction !== null

  const loadCompanyProfile = async (profileId: string) => {
    const businessProfile = await fetchBusinessProfile(profileId)
    const company = companies.find(
      (candidate) => candidate.profile_id === profileId,
    ) ?? active

    setActive(mergeBusinessProfileIntoCompany(company, businessProfile, profileId))
  }

  const completeMockAuth = async (action: MockAction, profileId?: string) => {
    setLoadingAction(action)
    setAuthError(null)

    try {
      if (profileId) {
        await loadCompanyProfile(profileId)
      }

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
          companies_house: active.companies_house
            ? {
                ...active.companies_house,
                legal_name: `${trimmedBusinessName} Ltd`,
              }
            : active.companies_house,
        } as Company)
      }

      window.setTimeout(() => {
        router.push("/onboarding")
      }, 800)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to load business profile")
      setLoadingAction(null)
    }
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const profileId = getProfileIdForDemoUsername(loginUsername)

    if (!profileId) {
      setAuthError(
        "Use breadbloom or movefit as the username. Any password will work.",
      )
      return
    }

    void completeMockAuth("username-login", profileId)
  }

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void completeMockAuth("signup")
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
            <label htmlFor="login-username" className="text-sm font-medium text-foreground">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              placeholder="breadbloom or movefit"
              autoComplete="username"
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
              placeholder="Any password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-[#F4D7E5] bg-white px-4 py-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-foreground text-white font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 disabled:opacity-60"
          >
            {loadingAction === "username-login" ? "Logging in..." : "Log in"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void completeMockAuth("govuk-login", MOCK_ONE_LOGIN_PROFILE_ID)}
            className="w-full border border-foreground/20 bg-white text-foreground font-medium py-4 rounded-2xl text-sm flex items-center justify-between px-6 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {loadingAction === "govuk-login" ? "Loading company..." : "Log in with GOV.UK OneLogin"}
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

      {authError && (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {authError}
        </p>
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
