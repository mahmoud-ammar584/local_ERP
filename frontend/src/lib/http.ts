import { getAccessToken, getRefreshToken, setTokens, clearTokens, getWorkspaceId } from './auth'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
  skipWorkspace?: boolean
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken()
  if (!refresh) throw new ApiError(401, 'No refresh token available.')

  const res = await fetch('/api/v1/auth/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    clearTokens()
    throw new ApiError(401, 'Session expired. Please sign in again.')
  }

  const data = await res.json()
  setTokens(data.access, refresh)
  return data.access
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth, skipWorkspace, headers: extraHeaders, ...rest } = options

  const buildHeaders = (token?: string | null): HeadersInit => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extraHeaders as Record<string, string>),
    }
    if (!skipAuth && token) h['Authorization'] = `Bearer ${token}`
    if (!skipWorkspace) {
      const wsId = getWorkspaceId()
      if (wsId) h['X-Workspace-ID'] = wsId
    }
    return h
  }

  let token = skipAuth ? null : getAccessToken()
  let res = await fetch(url, { ...rest, headers: buildHeaders(token) })

  if (res.status === 401 && !skipAuth) {
    try {
      token = await refreshAccessToken()
      res = await fetch(url, { ...rest, headers: buildHeaders(token) })
    } catch {
      throw new ApiError(401, 'Session expired. Please sign in again.')
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let details: unknown
    try {
      const body = await res.json()
      details = body
      if (body.detail)            message = body.detail
      else if (body.error)        message = body.error
      else if (body.non_field_errors) message = body.non_field_errors[0]
      else                        message = JSON.stringify(body)
    } catch { /* non-JSON body */ }
    throw new ApiError(res.status, message, details)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
