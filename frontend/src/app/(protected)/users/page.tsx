'use client'

import { useEffect, useState } from 'react'

interface UserItem {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
}

interface InvitationItem {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  is_used: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [invitations, setInvitations] = useState<InvitationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Invite modal state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('cashier')
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [inviteError, setInviteError] = useState('')

  const getHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    return {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      const [uRes, iRes] = await Promise.all([
        fetch('http://localhost:8000/api/auth/users/', { headers: getHeaders() }),
        fetch('http://localhost:8000/api/auth/invitations/', { headers: getHeaders() })
      ])
      if (uRes.ok) {
        const uData = await uRes.json()
        setUsers(uData.results || uData)
      }
      if (iRes.ok) {
        const iData = await iRes.json()
        setInvitations(iData.results || iData)
      }
    } catch (err: any) {
      setError(err.message || 'Error loading users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setGeneratedLink('')
    setInviting(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/invitations/', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Failed to create invitation')
      } else {
        const fullLink = `${window.location.origin}${data.invite_link}`
        setGeneratedLink(fullLink)
        setInviteEmail('')
        loadData()
      }
    } catch (err) {
      setInviteError('Error sending invitation.')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management & Email Invitations</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Invite team members by email. Users cannot self-register without an invitation.
        </p>
      </div>

      {/* Invite Member Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Send New Invitation</h2>

        {inviteError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {inviteError}
          </div>
        )}

        {generatedLink && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs space-y-2">
            <div className="font-bold">Invitation Link Created!</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px]"
              />
              <button
                onClick={() => navigator.clipboard.writeText(generatedLink)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 transition whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="cashier">Cashier</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-sm transition"
          >
            {inviting ? 'Generating...' : 'Generate Invite Link'}
          </button>
        </form>
      </div>

      {/* Active Users Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Active Company Users</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="p-3.5 font-semibold">User</th>
                <th className="p-3.5 font-semibold">Email</th>
                <th className="p-3.5 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-zinc-800/30">
                  <td className="p-3.5 font-medium text-white">{u.username} ({u.first_name} {u.last_name})</td>
                  <td className="p-3.5 text-zinc-400">{u.email || '—'}</td>
                  <td className="p-3.5 font-semibold text-amber-400 uppercase text-[10px]">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Pending Invitations</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="p-3.5 font-semibold">Invited Email</th>
                <th className="p-3.5 font-semibold">Role</th>
                <th className="p-3.5 font-semibold">Sent Date</th>
                <th className="p-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-500">No pending invitations.</td>
                </tr>
              ) : (
                invitations.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-800/30">
                    <td className="p-3.5 font-medium text-white">{inv.email}</td>
                    <td className="p-3.5 font-semibold text-zinc-400 uppercase text-[10px]">{inv.role}</td>
                    <td className="p-3.5 text-zinc-400 font-mono text-[11px]">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="p-3.5">
                      {inv.is_used ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px]">Accepted</span>
                      ) : new Date(inv.expires_at) < new Date() ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-[10px]">Expired</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-[10px]">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
