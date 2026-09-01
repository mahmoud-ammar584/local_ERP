import { getToken, clearSession } from './auth'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'https://local-erp-five.vercel.app').replace(/\/$/, '')
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const base = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, headers: extraHeaders, ...rest } = options
  const token = skipAuth ? null : getToken()
  const targetUrl = resolveApiUrl(url)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  const res = await fetch(targetUrl, {
    ...rest,
    headers,
  })

  if (res.status === 401 && !skipAuth) {
    clearSession()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    let details: unknown
    try {
      const text = await res.text()
      try {
        const body = JSON.parse(text)
        details = body
        if (body.error) message = body.error
        else if (body.detail) message = body.detail
        else if (body.items) message = Array.isArray(body.items) ? body.items.join(', ') : String(body.items)
        else if (body.non_field_errors) message = body.non_field_errors[0]
        else if (typeof body === 'object' && body !== null) {
          const firstKey = Object.keys(body)[0]
          if (firstKey) {
            if (Array.isArray(body[firstKey])) message = `${firstKey}: ${body[firstKey][0]}`
            else if (typeof body[firstKey] === 'string') message = `${firstKey}: ${body[firstKey]}`
          }
        }
      } catch {
        if (text && text.length < 200) message = text
      }
    } catch {
      // Body is not readable
    }
    throw new ApiError(res.status, message, details)
  }

  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}

export async function fetchFormData<T = unknown>(
  url: string,
  formData: FormData
): Promise<T> {
  const token = getToken()
  const targetUrl = resolveApiUrl(url)

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401) {
    clearSession()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = await res.json()
      if (body.error) message = body.error
      else if (body.detail) message = body.detail
    } catch {}
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

