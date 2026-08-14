'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { getUsers, getInvitations, createInvitation, deleteInvitation } from '@/lib/api'
import { ShieldCheck, Plus, Mail, Copy, Check, UserPlus, Trash2, X } from 'lucide-react'

export default function UsersPage() {
  const { t, language } = useLanguage()
  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('cashier')
  const [permissions, setPermissions] = useState<Record<string, string[]>>({
    sales: ['view', 'add'],
    inventory: ['view'],
    customers: ['view', 'add'],
    expenses: [],
  })
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviting, setInviting] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [u, i] = await Promise.all([getUsers(), getInvitations()])
      setUsers(Array.isArray(u) ? u : (u as any).results || [])
      setInvitations(Array.isArray(i) ? i : (i as any).results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res: any = await createInvitation(inviteEmail, inviteRole, permissions)
      const link = `${window.location.origin}/signup?token=${res.token}`
      setGeneratedLink(link)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to create invite')
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteInvite = async (id: number) => {
    try {
      await deleteInvitation(id)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete invite')
    }
  }

  const togglePermission = (module: string, action: string) => {
    setPermissions((prev) => {
      const current = prev[module] || []
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action]
      return { ...prev, [module]: updated }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>{t('usersTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إدارة حسابات فريق العمل وتحديد الصلاحيات وإرسال روابط الدعوات'
              : 'Manage team access, assign granular RBAC permissions and issue invites'}
          </p>
        </div>

        <button
          onClick={() => {
            setGeneratedLink('')
            setIsModalOpen(true)
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('inviteMember')}</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-300">Active Team Members</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">User</th>
                <th className="p-4 text-start">Email</th>
                <th className="p-4 text-start">Role</th>
                <th className="p-4 text-start">Company</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-900/30">
                  <td className="p-4 font-semibold text-white">
                    {u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}
                  </td>
                  <td className="p-4 text-zinc-400">{u.email || '—'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      u.role === 'admin'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      {u.role || 'Staff'}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-400">{u.company_name || 'La Boutique Deluxe'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invites Table */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-300">Pending Email Invitations</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">Target Email</th>
                <th className="p-4 text-start">Role</th>
                <th className="p-4 text-start">Expires At</th>
                <th className="p-4 text-end">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-500">
                    No pending invitations
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-900/30">
                    <td className="p-4 font-semibold text-white">{inv.email}</td>
                    <td className="p-4 text-zinc-400">{inv.role}</td>
                    <td className="p-4 text-zinc-500">{new Date(inv.expires_at).toLocaleString()}</td>
                    <td className="p-4 text-end">
                      <button
                        onClick={() => handleDeleteInvite(inv.id)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Invite Member */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{t('inviteMember')}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedLink ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                  Invitation link created successfully! Send this link to your team member to complete account setup:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : t('copyLink')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('inviteEmail')}</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="cashier@store.com"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('inviteRole')}</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cashier">Cashier / Staff</option>
                    <option value="admin">Store Admin</option>
                  </select>
                </div>

                {inviteRole !== 'admin' && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="block text-xs font-bold text-zinc-300 mb-2">{t('permissionsLabel')}</span>
                    {['sales', 'inventory', 'customers', 'expenses'].map((mod) => (
                      <div key={mod} className="flex items-center justify-between py-1 text-xs text-zinc-400">
                        <span className="capitalize">{mod}</span>
                        <div className="flex gap-2">
                          {['view', 'add', 'edit', 'delete'].map((act) => (
                            <label key={act} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(permissions[mod] || []).includes(act)}
                                onChange={() => togglePermission(mod, act)}
                                className="rounded text-amber-500 focus:ring-0"
                              />
                              <span className="text-[10px] uppercase">{act}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                  >
                    {inviting ? t('loading') : 'Generate Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
