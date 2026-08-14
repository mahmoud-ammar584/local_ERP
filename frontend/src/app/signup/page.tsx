'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [verifying, setVerifying] = useState(true)
  const [inviteData, setInviteData] = useState<{ valid: boolean; email: string; company_name: string; role: string } | null>(null)
  const [verifyError, setVerifyError] = useState('')

  const [form, setForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setVerifying(false)
      setVerifyError('Self-registration is disabled. Access is by email invitation only. Please contact your store administrator for an invitation link.')
      return
    }

    async function verifyToken() {
      try {
        const res = await fetch(`http://localhost:8000/api/auth/invitations/verify/?token=${encodeURIComponent(token!)}`)
        const data = await res.json()
        if (!res.ok) {
          setVerifyError(data.error || 'Invalid or expired invitation token.')
        } else {
          setInviteData(data)
        }
      } catch (err) {
        setVerifyError('Network error verifying invitation token.')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/invitations/accept/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username: form.username,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name
        })
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.error || (data.password ? data.password.join(' ') : 'Failed to create account')
        setError(msg)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 2000)
      }
    } catch (err) {
      setError('An error occurred during account creation.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 text-white">
        <div className="animate-pulse text-zinc-400">Verifying invitation link...</div>
      </div>
    )
  }

  if (verifyError) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 text-xl">✕</div>
          <h2 className="text-xl font-bold mb-2">Invitation Error</h2>
          <p className="text-zinc-400 text-sm mb-6">{verifyError}</p>
          <a href="/login" className="inline-block px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest font-semibold text-amber-400 mb-1">
            Accept Invitation
          </div>
          <h1 className="text-2xl font-bold">Join {inviteData?.company_name}</h1>
          <p className="text-xs text-zinc-400 mt-1">Set up your account credentials to access the ERP</p>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-center text-sm">
            Account created successfully! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Email Address</label>
              <input
                type="email"
                value={inviteData?.email || ''}
                disabled
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={update('username')}
                required
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="Choose a username"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={update('first_name')}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={update('last_name')}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                minLength={10}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="Min. 10 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-sm transition mt-2"
            >
              {loading ? 'Creating Account...' : 'Complete Signup'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
