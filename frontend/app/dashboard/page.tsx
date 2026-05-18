"use client"

import { useEffect, useMemo, useState } from "react"
import { TrendingUp, Clock, Star } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { Card } from "@/components/ui/card"
import { fetchMatchedSchemes, type MatchedScheme } from "@/lib/business-api"
import { useProfile } from "@/lib/profile-context"

const quickActions = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Innovation Grants",
    description: "R&D and tech funding",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Closing Soon",
    description: "Apply before deadline",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Recommended",
    description: "Based on your profile",
  },
]

const fitLabels: Record<MatchedScheme["fit"], string> = {
  strong_match: "Strong match",
  possible: "Possible",
  not_suitable: "Not suitable",
}

const regionLabels: Record<string, string> = {
  leeds: "Leeds",
  west_yorkshire: "West Yorkshire",
  national: "National",
}

function formatEffort(hours: number) {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`
}

export default function DashboardPage() {
  const { active } = useProfile()
  const name = active.user_provided.trading_name
  const [schemes, setSchemes] = useState<MatchedScheme[]>([])
  const [schemesLoading, setSchemesLoading] = useState(true)
  const [schemesError, setSchemesError] = useState<string | null>(null)
  const suggestedSchemes = useMemo(() => {
    const eligibleSchemes = schemes.filter((scheme) => scheme.fit !== "not_suitable")

    return (eligibleSchemes.length > 0 ? eligibleSchemes : schemes).slice(0, 3)
  }, [schemes])

  useEffect(() => {
    let cancelled = false

    setSchemesLoading(true)
    setSchemesError(null)

    fetchMatchedSchemes(active.profile_id)
      .then((matchedSchemes) => {
        if (!cancelled) {
          setSchemes(matchedSchemes)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSchemes([])
          setSchemesError(
            error instanceof Error ? error.message : "Unable to load matched schemes",
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSchemesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [active.profile_id])

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Logo */}
      <div className="flex justify-center pt-12 pb-2">
        <span className="text-xl font-black tracking-tight text-foreground">
          Funding<span className="text-accent">Fit</span>
        </span>
      </div>

      {/* Header */}
      <header className="px-6 pt-6 pb-8">
        <p className="text-2xl font-normal text-foreground mb-1">Good morning,</p>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {name}.
        </h1>
      </header>

      {/* Quick Actions */}
      <section className="px-6 mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              className="flex flex-col items-center text-center p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-2 text-foreground">
                {action.icon}
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">
                {action.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Suggested Schemes */}
      <section className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Suggested for you
          </h3>
          <button className="text-sm text-accent font-medium">
            View all
          </button>
        </div>
        <div className="space-y-3">
          {schemesLoading ? (
            [0, 1, 2].map((item) => (
              <Card key={item} className="p-4 rounded-xl border border-border">
                <div className="h-4 w-2/3 rounded bg-secondary mb-3" />
                <div className="h-3 w-1/2 rounded bg-secondary" />
              </Card>
            ))
          ) : schemesError ? (
            <Card className="p-4 rounded-xl border border-border">
              <p role="alert" className="text-sm text-muted-foreground">
                {schemesError}
              </p>
            </Card>
          ) : suggestedSchemes.length > 0 ? (
            suggestedSchemes.map((scheme) => (
              <Card
                key={scheme.scheme_id}
                className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <a
                  href={scheme.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground text-sm leading-snug flex-1 pr-2">
                      {scheme.name}
                    </h4>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full whitespace-nowrap">
                      {fitLabels[scheme.fit]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                    {scheme.plain_english_summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {scheme.funding_display}
                    </span>
                    <span>{regionLabels[scheme.region] ?? scheme.region}</span>
                    <span>{formatEffort(scheme.effort_hours)}</span>
                  </div>
                </a>
              </Card>
            ))
          ) : (
            <Card className="p-4 rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">
                No matched schemes found for this profile yet.
              </p>
            </Card>
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
