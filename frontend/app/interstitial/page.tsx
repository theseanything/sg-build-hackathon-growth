"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function InterstitialContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 400)
    const t2 = setTimeout(() => router.push(next), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [next, router])

  return (
    <div className="h-full bg-[#F4D7E5] flex flex-col items-center justify-center px-6 text-center">
      <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <p className="text-2xl font-semibold text-foreground tracking-tight mb-3">
          Going out to check different data...
        </p>
        <p className="text-base font-normal text-foreground/60">
          Crunching crunching...
        </p>
        <div className="flex items-center justify-center gap-2 mt-10">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function InterstitialPage() {
  return (
    <Suspense>
      <InterstitialContent />
    </Suspense>
  )
}
