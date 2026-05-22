"use client"

import { useCallback, useRef } from "react"

const TRIPLE_CLICK_WINDOW_MS = 600
const TRIPLE_CLICK_COUNT = 3

type FundingFitLogoProps = {
  className?: string
  onSecretActivate?: () => void
}

export function FundingFitLogo({ className, onSecretActivate }: FundingFitLogoProps) {
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    if (!onSecretActivate) return

    clickCountRef.current += 1
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    if (clickCountRef.current >= TRIPLE_CLICK_COUNT) {
      clickCountRef.current = 0
      onSecretActivate()
      return
    }

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, TRIPLE_CLICK_WINDOW_MS)
  }, [onSecretActivate])

  const content = (
    <>
      Funding<span className="text-accent">Fit</span>
    </>
  )

  if (!onSecretActivate) {
    return (
      <span className={className}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-label="FundingFit"
    >
      {content}
    </button>
  )
}
