"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, FileText, User } from "lucide-react"

interface NavItem {
  icon: React.ReactNode
  label: string
  href?: string
}

export function BottomNav() {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: "Home", href: "/dashboard" },
    { icon: <Search className="h-5 w-5" />, label: "Search" },
    { icon: <FileText className="h-5 w-5" />, label: "Saved" },
    { icon: <User className="h-5 w-5" />, label: "Profile", href: "/profile" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border sm:absolute">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = item.href != null && pathname === item.href
          const className = `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            isActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`

          if (item.href) {
            return (
              <Link key={item.label} href={item.href} className={className}>
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          }

          return (
            <button key={item.label} type="button" className={className} disabled>
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
