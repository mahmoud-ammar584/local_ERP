const ACCESS_KEY  = 'sarih_auth_access_token'
const REFRESH_KEY = 'sarih_auth_refresh_token'
const WS_KEY      = 'sarih_workspace_id'

export function setTokens(access: string, refresh: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
  document.cookie = `${ACCESS_KEY}=${access}; path=/; SameSite=Strict`
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(WS_KEY)
  document.cookie = `${ACCESS_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

export function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(WS_KEY)
}

export function setWorkspaceId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(WS_KEY, id)
}
