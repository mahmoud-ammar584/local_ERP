'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { getAuditLogs } from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { History, Search, Shield, RefreshCw, Lock } from 'lucide-react'

export default function AuditPage() {
  const { t, language } = useLanguage()
  const canView = hasPermission('audit', 'view')

  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function loadLogs() {
    setLoading(true)
    try {
      const data = await getAuditLogs()
      const list = Array.isArray(data) ? data : (data as any).results || []
      setLogs(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) {
      loadLogs()
    } else {
      setLoading(false)
    }
  }, [canView])

  if (!canView) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى سجل التدقيق والأمان' : 'Access Restricted to Security Audit'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية عرض سجل الأمان والتدقيق من قبل الإدارة.'
            : 'Your account does not have permission to view security audit logs.'}
        </p>
      </div>
    )
  }

  const filteredLogs = logs.filter((l) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (l.action && l.action.toLowerCase().includes(s)) ||
      (l.user_username && l.user_username.toLowerCase().includes(s)) ||
      (l.model_name && l.model_name.toLowerCase().includes(s)) ||
      (l.ip_address && l.ip_address.includes(s))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <span>{t('navAudit')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'سجل غير قابل للتعديل لجميع العمليات الحساسة وتغييرات المخزون والوصول للنظام'
              : 'Immutable security & audit log of transactions, inventory adjustments and user access'}
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26]">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute top-3 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث باسم المستخدم أو العملية أو الـ IP...' : 'Search by username, action or IP...'}
            className="w-full ps-9 pe-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">User</th>
                <th className="p-4 text-start">Action</th>
                <th className="p-4 text-start">Module / Model</th>
                <th className="p-4 text-start">IP Address</th>
                <th className="p-4 text-end">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    {loading ? t('loading') : t('noData')}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-900/30">
                    <td className="p-4 font-semibold text-white">@{l.user_username || 'system'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300 font-mono">{l.model_name || 'System'}</td>
                    <td className="p-4 text-zinc-400 font-mono">{l.ip_address || '—'}</td>
                    <td className="p-4 text-end text-zinc-500 font-mono">{new Date(l.created_at).toLocaleString()}</td>
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
