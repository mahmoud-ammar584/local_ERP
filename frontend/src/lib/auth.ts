export interface UserProfile {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  role: 'owner' | 'admin' | 'cashier' | 'custom' | string
  company_id: number
  company_name: string
  permissions: Record<string, string[]>
}

const TOKEN_KEY = 'funnel_auth_token'
const USER_KEY  = 'funnel_user_profile'

export function setSession(token: string, user: UserProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): UserProfile | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as UserProfile
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function hasPermission(module: string, action: string): boolean {
  const user = getUser()
  if (!user) return false
  // Only the tenant Owner has permanent, unconditional full access.
  // Store Admins and all other roles strictly follow their granular permissions matrix.
  if (user.role === 'owner') return true
  const perms = user.permissions || {}
  const modulePerms = perms[module] || []
  if (!Array.isArray(modulePerms)) return false

  // Direct match
  if (modulePerms.includes(action)) return true

  // Hierarchical fallback
  if (['adjust_stock', 'stocktake_reconcile', 'receive'].includes(action) && modulePerms.includes('edit')) return true
  if (['stocktake_count', 'stocktake_create'].includes(action) && modulePerms.includes('add')) return true
  if (['stocktake_view', 'print_barcode', 'export_csv', 'apply_discount'].includes(action) && modulePerms.includes('view')) return true

  return false
}

export function getDefaultRoute(): string {
  const user = getUser()
  if (!user) return '/login'
  if (user.role === 'owner' || hasPermission('dashboard', 'view')) {
    return '/dashboard'
  }
  if (hasPermission('sales', 'view')) return '/sales'
  if (hasPermission('inventory', 'view')) return '/inventory'
  if (hasPermission('customers', 'view')) return '/customers'
  if (hasPermission('purchases', 'view')) return '/purchases'
  if (hasPermission('expenses', 'view')) return '/expenses'
  return '/sales'
}
