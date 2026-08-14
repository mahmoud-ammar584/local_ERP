'use client'

import { useEffect, useState } from 'react'

interface AuditLog {
  id: number
  username: string
  user_email: string
  action: string
  model_name: string
  object_id: number | null
  ip_address: string | null
  timestamp: string
  details: any
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        const res = await fetch('/api/core/audit-logs/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!res.ok) {
          throw new Error('Failed to fetch audit logs. Admin access required.')
        }
        const data = await res.json()
        setLogs(data.results || data)
      } catch (err: any) {
        setError(err.message || 'Error loading audit logs')
      } finally {
        setLoading(false)
      }
    }
    fetchAuditLogs()
  }, [])

  const filteredLogs = logs.filter(log =>
    (log.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.model_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.ip_address || '').includes(search)
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Security & Activity Audit Logs</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Immutable log of all user activities, IP addresses, and mutating operations.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search logs by user, action, IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-full sm:w-80"
        />
      </div>

      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-zinc-500 text-sm animate-pulse">Loading audit trail...</div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3.5 font-semibold">Timestamp</th>
                  <th className="p-3.5 font-semibold">User</th>
                  <th className="p-3.5 font-semibold">Action</th>
                  <th className="p-3.5 font-semibold">Module</th>
                  <th className="p-3.5 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">No audit logs found.</td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                      <td className="p-3.5 text-zinc-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-medium text-white">
                        {log.username || 'System'}
                      </td>
                      <td className="p-3.5 font-medium text-amber-400">
                        {log.action}
                      </td>
                      <td className="p-3.5 text-zinc-400">
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px]">
                          {log.model_name || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-400 text-[11px]">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
