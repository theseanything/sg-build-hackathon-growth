"use client"

import { Home, Search, FileText, User } from "lucide-react"

interface NavItem {
  icon: React.ReactNode
  label: string
  active?: boolean
}

export function BottomNav() {
  const navItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: "Home", active: true },
    { icon: <Search className="h-5 w-5" />, label: "Search" },
    { icon: <FileText className="h-5 w-5" />, label: "Saved" },
    { icon: <User className="h-5 w-5" />, label: "Profile" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border sm:absolute">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              item.active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
