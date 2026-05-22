"use client"

import { ChevronLeft, CheckCircle2, AlertTriangle, XCircle, Zap, ShieldCheck, FileText, ExternalLink } from "lucide-react"
import type { MatchedScheme, SchemeFit } from "@/lib/business-api"

const fitChipStyles: Record<SchemeFit, string> = {
  strong_match: "bg-green-100 text-green-800",
  possible: "bg-amber-100 text-amber-800",
  not_suitable: "bg-secondary text-secondary-foreground",
}

const fitChipLabels: Record<SchemeFit, string> = {
  strong_match: "Strong match",
  possible: "Possible",
  not_suitable: "Not suitable",
}

const typeLabels: Record<string, string> = {
  grant: "Grant",
  loan: "Loan",
  discount: "Discount",
  training: "Training",
  support: "Support",
  tax_relief: "Tax relief",
}

interface SchemeDetailProps {
  scheme: MatchedScheme
  onBack: () => void
}

export function SchemeDetail({ scheme, onBack }: SchemeDetailProps) {
  const effortLabel = scheme.effort_display ?? `~${scheme.effort_hours} hrs`
  const met = scheme.eligibility_met ?? []
  const uncertain = scheme.eligibility_uncertain ?? []
  const unmet = scheme.eligibility_unmet ?? []
  const documents = scheme.documents ?? []

  const urlDisplay = scheme.url.replace(/^https?:\/\//, "").replace(/\/$/, "")

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* Hero */}
        <div className="px-6 pt-12 pb-5 border-b border-border">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#F4D7E5] flex items-center justify-center mb-6"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${fitChipStyles[scheme.fit]}`}>
              {fitChipLabels[scheme.fit]}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
              {typeLabels[scheme.scheme_type] ?? scheme.scheme_type}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">
            {scheme.name}
          </h1>
          <p className="text-sm text-muted-foreground">{scheme.provider}</p>
        </div>

        {/* Stats */}
        <div className="px-4 py-4 grid grid-cols-3 gap-2 border-b border-border">
          <StatBox label="Funding amount" value={scheme.funding_display} />
          <StatBox label="Est. effort" value={effortLabel} />
          <StatBox label="Decision time" value={scheme.decision_time ?? "—"} />
        </div>

        {/* What this is */}
        <section className="px-5 py-5 border-b border-border">
          <SectionHeader icon={<Zap className="h-4 w-4" />} title="What this is" />
          <p className="text-sm text-foreground leading-relaxed mt-3">
            {scheme.plain_english_summary}
          </p>
        </section>

        {/* Eligibility */}
        {(met.length > 0 || uncertain.length > 0 || unmet.length > 0) && (
          <section className="px-5 py-5 border-b border-border">
            <SectionHeader icon={<ShieldCheck className="h-4 w-4" />} title="Eligibility" />
            <div className="mt-3 space-y-2">
              {met.map((item) => (
                <EligibilityRow key={item} variant="met" text={item} />
              ))}
              {uncertain.map((item) => (
                <EligibilityRow key={item} variant="uncertain" text={item} />
              ))}
              {unmet.map((item) => (
                <EligibilityRow key={item} variant="unmet" text={item} />
              ))}
            </div>
          </section>
        )}

        {/* Documents to prepare */}
        <section className="px-5 py-5 border-b border-border">
          <SectionHeader icon={<FileText className="h-4 w-4" />} title="Documents to prepare" />
          {documents.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {documents.map((doc) => (
                <div
                  key={doc}
                  className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-xs text-foreground"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  <span className="leading-snug">{doc}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-3">
              No specific documents listed — check the provider's website for requirements.
            </p>
          )}
        </section>

        {/* Fit signal */}
        {scheme.fit_reason && (
          <section className="px-5 py-5 border-b border-border">
            <SectionHeader icon={<CheckCircle2 className="h-4 w-4" />} title="Fit signal" />
            <p className="text-sm text-foreground leading-relaxed mt-3">
              {scheme.fit_reason}
            </p>
          </section>
        )}

      </div>

      {/* Sticky bottom actions */}
      <div className="shrink-0 px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-border bg-white">
        <div className="flex gap-3 mb-3">
          <button
            type="button"
            className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
          >
            Add to plan
          </button>
          <a
            href={scheme.url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-1.5"
          >
            Read more
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <FileText className="h-3 w-3 shrink-0" />
          Source:{" "}
          <a href={scheme.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {urlDisplay}
          </a>
          {scheme.last_verified && (
            <span>· Verified {scheme.last_verified}</span>
          )}
        </p>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 rounded-xl bg-secondary/50">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground leading-snug">{value}</span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
    </div>
  )
}

function EligibilityRow({ variant, text }: { variant: "met" | "uncertain" | "unmet"; text: string }) {
  const styles = {
    met: {
      row: "bg-green-50 border-green-200",
      icon: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
      text: "text-green-900",
    },
    uncertain: {
      row: "bg-amber-50 border-amber-200",
      icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
      text: "text-amber-900",
    },
    unmet: {
      row: "bg-red-50 border-red-200",
      icon: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
      text: "text-red-900",
    },
  }[variant]

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${styles.row}`}>
      {styles.icon}
      <span className={`text-sm leading-snug ${styles.text}`}>{text}</span>
    </div>
  )
}
