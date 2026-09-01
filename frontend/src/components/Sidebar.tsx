import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  Shirt,
  ShoppingCart,
  Truck,
  Users,
  Receipt,
  Settings,
  ShieldCheck,
  History,
  Sparkles,
  ClipboardCheck,
  X,
} from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { t, language } = useLanguage()
  const { user, hasPermission, hasAnyPermission } = useAuth()

  const navItems = [
    {
      label: t('navDashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      show: user?.role === 'owner' || hasAnyPermission('dashboard') || hasPermission('dashboard', 'view'),
    },
    {
      label: t('navSales'),
      href: '/sales',
      icon: ShoppingCart,
      show: user?.role === 'owner' || hasAnyPermission('sales'),
    },
    {
      label: t('navInventory'),
      href: '/inventory',
      icon: Shirt,
      show: user?.role === 'owner' || hasAnyPermission('inventory'),
    },
    {
      label: t('navStocktake'),
      href: '/inventory/stocktake',
      icon: ClipboardCheck,
      show:
        user?.role === 'owner' ||
        hasPermission('inventory', 'stocktake_view') ||
        hasPermission('inventory', 'stocktake_count') ||
        hasAnyPermission('inventory'),
    },
    {
      label: t('navPurchases'),
      href: '/purchases',
      icon: Truck,
      show: user?.role === 'owner' || hasAnyPermission('purchases'),
    },
    {
      label: t('navCustomers'),
      href: '/customers',
      icon: Users,
      show: user?.role === 'owner' || hasAnyPermission('customers'),
    },
    {
      label: t('navExpenses'),
      href: '/expenses',
      icon: Receipt,
      show: user?.role === 'owner' || hasAnyPermission('expenses'),
    },
    {
      label: t('navSettings'),
      href: '/settings',
      icon: Settings,
      show: user?.role === 'owner' || hasAnyPermission('settings'),
    },
    {
      label: t('navUsers'),
      href: '/users',
      icon: ShieldCheck,
      show: user?.role === 'owner' || hasAnyPermission('users'),
    },
    {
      label: t('navAudit'),
      href: '/audit',
      icon: History,
      show: user?.role === 'owner' || hasAnyPermission('audit'),
    },
  ]

  const sidebarContent = (
    <div className="w-64 bg-[#0a0a0c] border-r border-[#1e1e26] flex flex-col h-full shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1e1e26] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-zinc-950" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
              Funnel <span className="text-amber-400 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">ERP</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium">{t('brandSubtitle')}</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.filter(item => item.show).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (onClose) onClose()
              }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Active Company Footer */}
      <div className="p-4 border-t border-[#1e1e26] bg-zinc-950/40">
        <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">
          {t('activeTenant')}
        </div>
        <div className="text-xs font-semibold text-zinc-200 truncate">
          {user?.company_name || 'La Boutique Deluxe'}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 truncate max-w-[120px]">
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            user?.role === 'owner'
              ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-sm shadow-amber-500/20'
              : user?.role === 'admin'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
          }`}>
            {user?.role === 'owner' ? t('ownerRole') : user?.role === 'admin' ? t('adminRole') : t('cashierRole')}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col min-h-screen shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Container */}
          <div className="relative z-50 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
