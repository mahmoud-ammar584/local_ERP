'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { getAuditLogs } from '@/lib/api'
import { History, Search, Shield, RefreshCw } from 'lucide-react'

export default function AuditPage() {
  const { t, language } = useLanguage()
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
    loadLogs()
  }, [])

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
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute top-3 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالإجراء أو المستخدم أو IP...' : 'Search by action, user or IP...'}
            className="w-full ps-9 pe-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">Action</th>
                <th className="p-4 text-start">Target Model</th>
                <th className="p-4 text-start">User</th>
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
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/30">
                    <td className="p-4 font-semibold text-white">
                      <span className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>{log.action}</span>
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{log.user_full_name || log.username || log.user_username || 'System'}</span>
                        {log.user_role && log.user_role !== 'system' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-400 font-mono">
                            {log.user_role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-zinc-500">{log.ip_address || '—'}</td>
                    <td className="p-4 text-end text-zinc-500">
                      {new Date(log.timestamp).toLocaleString()}
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
