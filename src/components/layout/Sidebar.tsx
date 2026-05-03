'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/dashboard/productos', label: 'Mis Productos', icon: '📦' },
  { href: '/dashboard/tendencias', label: 'Radar de Ventas', icon: '📡' },
  { href: '/dashboard/inventario', label: 'Inventario Bot', icon: '🛒' },
  { href: '/dashboard/bot', label: 'Bot WhatsApp', icon: '💬' },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 flex flex-col bg-slate-900 border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          DigitalMint
        </span>
        <p className="text-xs text-slate-500 mt-0.5">Panel de Control</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-purple-600/20 text-purple-300'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="px-3 py-2 rounded-lg bg-white/5 mb-2">
          <p className="text-xs text-slate-500">Cuenta</p>
          <p className="text-sm text-slate-300 truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <span>🚪</span> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
