'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage, t } from '@/lib/i18n'
import {
  getDaftraStatus, connectDaftra, testDaftra,
  disconnectDaftra, triggerSync, getSyncStatus,
} from '@/lib/api'
import type { DaftraConnectionStatus, SyncStatus } from '@/lib/api'
import { RefreshCw } from 'lucide-react'

export default function IntegrationsPage() {
  const { language } = useLanguage()
  const [status, setStatus] = useState<DaftraConnectionStatus | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [subdomain, setSubdomain] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const data = await getDaftraStatus()
      setStatus(data)
    } catch {
      /* silent */
    }
  }, [])

  const loadSyncStatus = useCallback(async () => {
    try {
      const data = await getSyncStatus()
      setSyncStatus(data)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    loadStatus()
    loadSyncStatus()
  }, [loadStatus, loadSyncStatus])

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      await connectDaftra(subdomain, apiKey)
      setSuccess('Connected successfully.')
      setSubdomain(''); setApiKey('')
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    setError(''); setSuccess('')
    setLoading(true)
    try {
      const r = await testDaftra()
      if (r.ok) setSuccess('Connection test passed.')
      else setError(r.detail || 'Test failed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    setError(''); setSuccess('')
    setLoading(true)
    try {
      await disconnectDaftra()
      setSuccess('Disconnected.')
      setStatus(null)
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setError(''); setSuccess('')
    setSyncing(true)
    try {
      await triggerSync()
      setSuccess('Sync triggered.')
      await loadSyncStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  const isConnected = status?.status === 'connected'

  return (
    <div>
      {/* Header */}
      <header className="mb-8">
        <div className="sarih-label mb-1">{t('integrations', language)}</div>
        <h1 className="text-[20pt] font-semibold text-text-primary leading-none">
          Data Sources
        </h1>
      </header>

      {/* Messages */}
      {error && (
        <div className="p-3 border border-signal-critical/40 bg-[#1A0000] rounded-sm text-[9pt] text-signal-critical mb-4">
          ✕ {error}
        </div>
      )}
      {success && (
        <div className="p-3 border border-signal-stable/40 bg-[#001A0D] rounded-sm text-[9pt] text-signal-stable mb-4">
          ✓ {success}
        </div>
      )}

      {/* Daftra Card */}
      <div className="sarih-card p-6">
        {/* Title */}
        <div className="flex gap-4 items-start mb-6">
          <div className="w-10 h-10 bg-void-card2 border border-void-border rounded-sm flex items-center justify-center">
            <span className="text-signal-amber font-bold text-sm">D</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-[14pt] font-semibold text-text-primary">Daftra</h2>
              {isConnected ? (
                <span className="sarih-pill-stable">CONNECTED</span>
              ) : (
                <span className="sarih-pill-amber">DISCONNECTED</span>
              )}
            </div>
            <p className="sarih-context">Accounting & ERP Integration</p>
          </div>
        </div>

        {/* Connected state */}
        {isConnected && status && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="sarih-label mb-1">Subdomain</p>
                <p className="text-sm text-text-primary">{status.subdomain || '--'}</p>
              </div>
              <div>
                <p className="sarih-label mb-1">API Key</p>
                <p className="text-sm text-text-primary font-mono">{status.masked_token || '••••••'}</p>
              </div>
            </div>
            {status.last_synced_at && (
              <p className="text-[8pt] text-text-muted">
                Last synced: {new Date(status.last_synced_at).toLocaleString()}
              </p>
            )}

            {/* Sync status */}
            {syncStatus && (
              <div className="flex items-center gap-2">
                <span className="sarih-label">Sync Status:</span>
                <span className={`text-[9pt] font-medium ${
                  syncStatus.status === 'done' ? 'text-signal-stable' :
                  syncStatus.status === 'error' ? 'text-signal-critical' :
                  syncStatus.status === 'running' ? 'text-signal-amber' :
                  'text-text-muted'
                }`}>
                  {syncStatus.status.toUpperCase()}
                </span>
              </div>
            )}

            <div className="sarih-divider" />

            <div className="flex gap-2">
              <button
                id="sync-btn"
                onClick={handleSync}
                disabled={syncing}
                className="sarih-btn"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                id="test-connection-btn"
                onClick={handleTest}
                disabled={loading}
                className="sarih-btn"
              >
                Test Connection
              </button>
              <button
                id="disconnect-btn"
                onClick={handleDisconnect}
                disabled={loading}
                className="sarih-btn hover:!text-signal-critical hover:!border-signal-critical/40"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Disconnected — Connect form */}
        {!isConnected && (
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-[8pt] font-bold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                Subdomain
              </label>
              <input
                id="daftra-subdomain"
                type="text"
                value={subdomain}
                onChange={e => setSubdomain(e.target.value)}
                className="sarih-input"
                placeholder="yourcompany"
                required
              />
              <p className="text-[7pt] text-text-muted mt-1">yourcompany.daftra.com</p>
            </div>
            <div>
              <label className="block text-[8pt] font-bold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                API Key
              </label>
              <input
                id="daftra-api-key"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="sarih-input"
                placeholder="Your Daftra API key"
                required
              />
            </div>
            <button
              id="connect-daftra-btn"
              type="submit"
              disabled={loading}
              className="sarih-btn-primary"
            >
              {loading ? 'Connecting...' : 'Connect Daftra'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
