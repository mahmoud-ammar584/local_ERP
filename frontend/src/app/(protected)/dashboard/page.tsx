'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage, t } from '@/lib/i18n'
import { fetchVerdicts, fetchEngineVerdicts } from '@/lib/api'
import type { Verdict, EngineResponse } from '@/lib/api'
import { RefreshCw } from 'lucide-react'
import { FinancialStatePanel } from '@/components/FinancialStatePanel'
import { RiskVerdictCard } from '@/components/RiskVerdictCard'
import { VerdictCard } from '@/components/VerdictCard'
import { ManualUploadSection } from '@/components/ManualUploadSection'

export default function DashboardPage() {
  const { language } = useLanguage()
  const [verdicts, setVerdicts] = useState<Verdict | null>(null)
  const [engine, setEngine] = useState<EngineResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadVerdicts = useCallback(async () => {
    try {
      const data = await fetchVerdicts()
      setVerdicts(data)
    } catch {
      /* silent */
    }
  }, [])

  const loadEngine = useCallback(async () => {
    try {
      const data = await fetchEngineVerdicts()
      setEngine(data)
    } catch {
      /* silent */
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadVerdicts(), loadEngine()])
    } catch {
      setError('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [loadVerdicts, loadEngine])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const hasData = verdicts?.has_data ?? false
  const sourceLabel = verdicts?.source_mode
    ? verdicts.source_mode.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  return (
    <div>
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="sarih-label mb-1">{t('dashboard', language)}</div>
          <h1 className="text-[20pt] font-semibold text-text-primary leading-none">
            {hasData ? 'Analysis complete.' : 'Awaiting data.'}
          </h1>
          {sourceLabel && (
            <p className="text-[9pt] text-text-muted mt-1">
              Source: <span className="text-signal-amber">{sourceLabel}</span>
            </p>
          )}
        </div>
        <button
          id="refresh-dashboard"
          onClick={loadAll}
          disabled={loading}
          className="sarih-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh', language)}
        </button>
      </header>

      {error && (
        <div className="p-3 border border-signal-critical/40 bg-[#1A0000] rounded-sm text-[9pt] text-signal-critical mb-6">
          ✕ {error}
        </div>
      )}

      {/* Financial State Panel */}
      {engine?.financial_state && (
        <div className="mb-8">
          <FinancialStatePanel state={engine.financial_state} language={language} />
        </div>
      )}

      {/* Engine Verdicts — Fact→Cause→Risk→Action */}
      {engine?.verdicts && engine.verdicts.length > 0 && (
        <div className="mb-8">
          <div className="sarih-label mb-3">{t('verdict', language)}</div>
          <div className="space-y-4">
            {engine.verdicts.map(v => (
              <RiskVerdictCard key={v.id} verdict={v} language={language} />
            ))}
          </div>
        </div>
      )}

      {/* Transaction Verdicts */}
      {hasData && verdicts && (
        <div className="mb-8">
          <div className="sarih-label mb-3">{t('transactionVerdicts', language)}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {verdicts.verdicts.stalled_cash && verdicts.verdicts.stalled_cash.length > 0 && (
              <VerdictCard
                title={t('stalledCash', language)}
                items={verdicts.verdicts.stalled_cash.map(s => ({
                  label: s.client_name,
                  value: `${s.total_stalled_amount.toLocaleString()}`,
                  signal: 'risk' as const,
                }))}
                signal="risk"
              />
            )}
            {verdicts.verdicts.orphan_payments && verdicts.verdicts.orphan_payments.length > 0 && (
              <VerdictCard
                title={t('orphanPayments', language)}
                items={verdicts.verdicts.orphan_payments.map(o => ({
                  label: o.client_name,
                  value: `${o.total_orphan_amount.toLocaleString()}`,
                  signal: 'critical' as const,
                }))}
                signal="critical"
              />
            )}
            {verdicts.verdicts.refund_spikes && verdicts.verdicts.refund_spikes.length > 0 && (
              <VerdictCard
                title={t('refundSpikes', language)}
                items={verdicts.verdicts.refund_spikes.map(r => ({
                  label: r.client_name,
                  value: r.refund_ratio,
                  signal: 'risk' as const,
                }))}
                signal="risk"
              />
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasData && !loading && (
        <div className="sarih-card p-10 text-center">
          <p className="text-text-muted text-sm mb-1">{t('noDataYet', language)}</p>
          <p className="text-[8pt] text-text-muted">{t('uploadToStart', language)}</p>
        </div>
      )}

      {/* Upload Section */}
      <div className="mt-8">
        <ManualUploadSection language={language} onUploadComplete={loadAll} />
      </div>
    </div>
  )
}
