"use client"

import { Home, Search, FileText, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

interface NavItem {
  icon: React.ReactNode
  label: string
  href?: string
}

const navItems: NavItem[] = [
  { icon: <Home className="h-5 w-5" />, label: "Home", href: "/dashboard" },
  { icon: <Search className="h-5 w-5" />, label: "Search" },
  { icon: <FileText className="h-5 w-5" />, label: "Saved" },
  { icon: <User className="h-5 w-5" />, label: "Profile", href: "/profile" },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border sm:absolute">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const active = item.href ? pathname === item.href : false
          const interactive = Boolean(item.href)
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.href) router.push(item.href)
              }}
              disabled={!interactive}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              } ${!interactive ? "cursor-default" : ""}`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
