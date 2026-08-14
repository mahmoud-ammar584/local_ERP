export interface UserProfile {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  role: 'admin' | 'cashier' | string
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

export function hasPermission(module: string, action: 'view' | 'add' | 'edit' | 'delete'): boolean {
  const user = getUser()
  if (!user) return false
  if (user.role === 'admin') return true
  const perms = user.permissions || {}
  const modulePerms = perms[module] || []
  return modulePerms.includes(action)
}
