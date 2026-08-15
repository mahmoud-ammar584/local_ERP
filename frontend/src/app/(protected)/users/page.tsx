'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { getUsers, getInvitations, createInvitation, deleteInvitation, updateUser } from '@/lib/api'
import { getUser } from '@/lib/auth'
import {
  ShieldCheck,
  Plus,
  Mail,
  Copy,
  Check,
  UserPlus,
  Trash2,
  X,
  Edit3,
  CheckSquare,
  Square,
  Shield,
  User,
} from 'lucide-react'

const AVAILABLE_MODULES = [
  { id: 'dashboard', labelAr: 'لوحة التحكم (Dashboard)', labelEn: 'Dashboard Analytics', actions: ['view'] },
  { id: 'sales', labelAr: 'المبيعات ونقاط البيع (POS)', labelEn: 'Sales & POS', actions: ['view', 'add', 'edit', 'delete'] },
  { id: 'inventory', labelAr: 'المخزون والمنتجات', labelEn: 'Inventory & Stock', actions: ['view', 'add', 'edit', 'delete'] },
  { id: 'purchases', labelAr: 'المشتريات والموردين', labelEn: 'Purchases & Inward', actions: ['view', 'add', 'edit', 'delete'] },
  { id: 'customers', labelAr: 'العملاء والديون', labelEn: 'Customers & Balances', actions: ['view', 'add', 'edit', 'delete'] },
  { id: 'expenses', labelAr: 'المصروفات التشغيلية', labelEn: 'Expenses', actions: ['view', 'add', 'edit', 'delete'] },
  { id: 'settings', labelAr: 'الإعدادات والبيانات الأساسية', labelEn: 'Settings & Master Data', actions: ['view', 'add', 'edit', 'delete'] },
  { id: 'users', labelAr: 'إدارة فريق العمل والصلاحيات', labelEn: 'Team & RBAC', actions: ['view', 'add', 'edit', 'delete'] },
  { id: 'audit', labelAr: 'سجل العمليات والأمان', labelEn: 'Security Audit', actions: ['view'] },
]

export default function UsersPage() {
  const { t, language } = useLanguage()
  const currentUser = getUser()

  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('cashier')
  const [invitePermissions, setInvitePermissions] = useState<Record<string, string[]>>({
    sales: ['view', 'add'],
    inventory: ['view'],
    customers: ['view', 'add'],
    expenses: [],
  })
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Edit Permissions Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editRole, setEditRole] = useState('cashier')
  const [editPermissions, setEditPermissions] = useState<Record<string, string[]>>({})
  const [savingEdit, setSavingEdit] = useState(false)

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

  // --- Handlers for Invite ---
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res: any = await createInvitation(inviteEmail, inviteRole, invitePermissions)
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

  // --- Handlers for Edit Permissions ---
  const openEditModal = (targetUser: any) => {
    setEditingUser(targetUser)
    setEditRole(targetUser.role || 'cashier')
    setEditPermissions(targetUser.permissions || {})
    setIsEditModalOpen(true)
  }

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSavingEdit(true)
    try {
      await updateUser(editingUser.id, {
        role: editRole,
        permissions: editPermissions,
      })
      setIsEditModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to update user permissions')
    } finally {
      setSavingEdit(false)
    }
  }

  const togglePermission = (
    perms: Record<string, string[]>,
    setPerms: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    module: string,
    action: string
  ) => {
    const current = perms[module] || []
    const updated = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action]
    setPerms({ ...perms, [module]: updated })
  }

  const toggleAllForModule = (
    perms: Record<string, string[]>,
    setPerms: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    module: string,
    allActions: string[]
  ) => {
    const current = perms[module] || []
    const hasAll = allActions.every((a) => current.includes(a))
    setPerms({ ...perms, [module]: hasAll ? [] : [...allActions] })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>{t('usersTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إدارة حسابات فريق العمل، تحديد الأدوار (Owner/Admin/Cashier)، والتحكم الدقيق في صلاحيات كل شاشة وخدمة'
              : 'Manage team access, roles (Owner/Admin/Cashier), and granular per-module action permissions'}
          </p>
        </div>

        <button
          onClick={() => {
            setGeneratedLink('')
            setIsInviteModalOpen(true)
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('inviteMember')}</span>
        </button>
      </div>

      {/* Active Users Table */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-300">Active Team Members ({users.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">User</th>
                <th className="p-4 text-start">Email</th>
                <th className="p-4 text-start">Role</th>
                <th className="p-4 text-start">Active Permissions</th>
                <th className="p-4 text-end">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {users.map((u) => {
                const isOwner = u.role === 'owner'
                const isAdmin = u.role === 'admin'
                const permsCount = Object.values(u.permissions || {}).reduce(
                  (acc: number, list: any) => acc + (Array.isArray(list) ? list.length : 0),
                  0
                )

                return (
                  <tr key={u.id} className="hover:bg-zinc-900/30">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 font-bold">
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span>{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}</span>
                          <span className="block text-[10px] text-zinc-500 font-mono">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400">{u.email || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        isOwner
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-sm shadow-amber-500/20'
                          : isAdmin
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {isOwner ? '👑 Owner' : isAdmin ? '🛡️ Admin' : 'Staff / Cashier'}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400">
                      {isOwner || isAdmin ? (
                        <span className="text-emerald-400 font-semibold">Full Access (All Modules)</span>
                      ) : permsCount > 0 ? (
                        <span className="text-amber-400 font-semibold">{permsCount} Custom Actions Active</span>
                      ) : (
                        <span className="text-zinc-500">Restricted</span>
                      )}
                    </td>
                    <td className="p-4 text-end">
                      <button
                        onClick={() => openEditModal(u)}
                        disabled={isOwner && currentUser?.role !== 'owner'}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('editPermissions')}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invites Table */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-300">Pending Email Invitations ({invitations.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">Target Email</th>
                <th className="p-4 text-start">Assigned Role</th>
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
                    <td className="p-4 text-zinc-400 capitalize">{inv.role}</td>
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

      {/* Modal: Edit User Role & Permissions */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    {language === 'ar' ? 'تعديل صلاحيات العضو' : 'Edit Member Role & Permissions'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {editingUser.first_name ? `${editingUser.first_name} ${editingUser.last_name || ''}` : editingUser.username} (@{editingUser.username})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {language === 'ar' ? 'الدور الوظيفي (Role)' : 'Assigned Role'}
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={editingUser.role === 'owner'}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                >
                  <option value="cashier">Cashier / Staff (كاشير / موظف)</option>
                  <option value="admin">Store Admin (مدير المتجر)</option>
                  {currentUser?.role === 'owner' && <option value="owner">Store Owner (المالك)</option>}
                </select>
              </div>

              {/* Permissions Matrix */}
              {editRole !== 'admin' && editRole !== 'owner' ? (
                <div className="pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-zinc-200">
                      {language === 'ar' ? 'مصفوفة الصلاحيات الدقيقة لكل شاشة:' : 'Granular Permissions Matrix:'}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto p-1">
                    {AVAILABLE_MODULES.map((mod) => {
                      const modPerms = editPermissions[mod.id] || []
                      return (
                        <div key={mod.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900">
                            <span className="text-xs font-bold text-white">
                              {language === 'ar' ? mod.labelAr : mod.labelEn}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleAllForModule(editPermissions, setEditPermissions, mod.id, mod.actions)}
                              className="text-[10px] text-amber-400 hover:underline"
                            >
                              {mod.actions.every((a) => modPerms.includes(a)) ? 'Clear' : 'Select All'}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-4">
                            {mod.actions.map((act) => (
                              <label key={act} className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300 hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={modPerms.includes(act)}
                                  onChange={() => togglePermission(editPermissions, setEditPermissions, mod.id, act)}
                                  className="rounded text-amber-500 focus:ring-0 w-3.5 h-3.5 bg-zinc-900 border-zinc-700"
                                />
                                <span className="uppercase text-[10px] font-bold text-zinc-400">{act}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  {editRole === 'owner'
                    ? 'المالك يمتلك وصولاً كاملاً وغير مقيد لجميع شاشات وخدمات النظام.'
                    : 'المدير يمتلك وصولاً كاملاً لجميع العمليات والبيانات افتراضياً.'}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                >
                  {savingEdit ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Member */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{t('inviteMember')}</span>
              </h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedLink ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                  {language === 'ar'
                    ? 'تم إنشاء رابط الدعوة بنجاح! أرسل هذا الرابط للموظف لإكمال تسجيل حسابه:'
                    : 'Invitation link created successfully! Send this link to your team member to complete account setup:'}
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
                    <option value="cashier">Cashier / Staff (كاشير / موظف)</option>
                    <option value="admin">Store Admin (مدير المتجر)</option>
                  </select>
                </div>

                {inviteRole !== 'admin' && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="block text-xs font-bold text-zinc-300 mb-2">{t('permissionsLabel')}</span>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {AVAILABLE_MODULES.map((mod) => {
                        const modPerms = invitePermissions[mod.id] || []
                        return (
                          <div key={mod.id} className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-white">
                                {language === 'ar' ? mod.labelAr : mod.labelEn}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {mod.actions.map((act) => (
                                <label key={act} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={modPerms.includes(act)}
                                    onChange={() => togglePermission(invitePermissions, setInvitePermissions, mod.id, act)}
                                    className="rounded text-amber-500 focus:ring-0 w-3.5 h-3.5"
                                  />
                                  <span className="text-[10px] uppercase font-bold text-zinc-400">{act}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
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
