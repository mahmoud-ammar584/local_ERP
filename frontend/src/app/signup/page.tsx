'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setTokens } from '@/lib/auth'
import { fetchJson, ApiError } from '@/lib/http'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', organization_name: ''
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await fetchJson<{ access: string; refresh: string; workspace_id?: string }>(
        '/api/v1/auth/register/',
        { method: 'POST', body: JSON.stringify(form), skipAuth: true }
      )
      setTokens(data.access, data.refresh)
      if (data.workspace_id) localStorage.setItem('sarih_workspace_id', data.workspace_id)
      router.push('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === 'object') {
        const msg = Object.entries(err.details as Record<string, string[]>)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' · ')
        setError(msg || err.message)
      } else {
        setError(err instanceof ApiError ? err.message : 'Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="fixed left-0 top-0 bottom-0 w-[3px] bg-signal-amber" />
      <div className="w-full max-w-[440px]">
        <div className="mb-8">
          <div className="text-[7pt] font-bold tracking-[0.18em] text-signal-amber mb-3 uppercase">
            صريح  ·  SARIH
          </div>
          <h1 className="text-[24pt] font-bold text-text-primary leading-none">
            Create your workspace.
          </h1>
          <p className="text-[10pt] text-text-muted mt-2">
            Full access. No trial period theater.
          </p>
        </div>
        <div className="h-px bg-void-border mb-6" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 border border-signal-critical/40 bg-[#1A0000] rounded-sm text-[9pt] text-signal-critical">
              ✕ {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(['first_name', 'last_name'] as const).map(k => (
              <div key={k}>
                <label className="block text-[8pt] font-bold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                  {k === 'first_name' ? 'First Name' : 'Last Name'}
                </label>
                <input id={`signup-${k}`} type="text" value={form[k]} onChange={update(k)} className="sarih-input" />
              </div>
            ))}
          </div>
          {[
            { k: 'email',             label: 'Email',                 type: 'email',    placeholder: 'you@company.com', required: true },
            { k: 'password',          label: 'Password',              type: 'password', placeholder: 'Min. 8 characters', required: true },
            { k: 'organization_name', label: 'Organization',          type: 'text',     placeholder: 'Your company name', required: true },
          ].map(({ k, label, type, placeholder, required }) => (
            <div key={k}>
              <label className="block text-[8pt] font-bold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                {label}
              </label>
              <input
                id={`signup-${k}`}
                type={type}
                value={form[k as keyof typeof form]}
                onChange={update(k as keyof typeof form)}
                className="sarih-input"
                placeholder={placeholder}
                required={required}
                minLength={k === 'password' ? 8 : undefined}
              />
            </div>
          ))}
          <button id="signup-submit" type="submit" disabled={loading} className="sarih-btn-primary w-full mt-2">
            {loading ? 'Creating workspace...' : 'Create Account  →'}
          </button>
        </form>
        <p className="text-center text-[9pt] text-text-muted mt-6">
          Already have access?{' '}
          <a href="/login" className="text-signal-amber hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
