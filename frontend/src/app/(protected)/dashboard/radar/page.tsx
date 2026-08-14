'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage, t } from '@/lib/i18n'
import { fetchEngineVerdicts } from '@/lib/api'
import type { EngineResponse, FinancialStateResponse } from '@/lib/api'
import { RefreshCw } from 'lucide-react'

interface MetricTileProps {
  label: string
  value: string | number | null
  suffix?: string
  signal?: 'stable' | 'risk' | 'critical' | 'neutral'
}

function MetricTile({ label, value, suffix, signal = 'neutral' }: MetricTileProps) {
  const valueColor: Record<string, string> = {
    stable:   'text-signal-stable',
    risk:     'text-signal-risk',
    critical: 'text-signal-critical',
    neutral:  'text-text-primary',
  }

  const displayValue = value === null || value === undefined ? '--' : value

  return (
    <div className="sarih-card p-4 space-y-1">
      <p className="sarih-label">{label}</p>
      <p className={`text-[24pt] font-light leading-none ${valueColor[signal]}`}>
        {displayValue}
        {suffix && <span className="text-[9pt] text-text-muted ml-1.5">{suffix}</span>}
      </p>
    </div>
  )
}

function getRunwaySignal(months: number | null): 'stable' | 'risk' | 'critical' | 'neutral' {
  if (months === null) return 'neutral'
  if (months >= 12) return 'stable'
  if (months >= 6) return 'risk'
  return 'critical'
}

function getGrowthSignal(rate: number | null): 'stable' | 'risk' | 'critical' | 'neutral' {
  if (rate === null) return 'neutral'
  if (rate > 0) return 'stable'
  if (rate > -0.1) return 'risk'
  return 'critical'
}

export default function RadarPage() {
  const { language } = useLanguage()
  const [engine, setEngine] = useState<EngineResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEngineVerdicts()
      setEngine(data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const fs: FinancialStateResponse | null = engine?.financial_state ?? null

  const fmt = (n: number | null, decimals = 0): string => {
    if (n === null || n === undefined) return '--'
    return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
  }

  return (
    <div>
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="sarih-label mb-1">{t('radarTitle', language)}</div>
          <h1 className="text-[20pt] font-semibold text-text-primary leading-none">
            {t('keyMetrics', language)}
          </h1>
          {lastUpdated && (
            <p className="text-[8pt] text-text-muted mt-1">
              {t('lastUpdated', language)}: {lastUpdated}
            </p>
          )}
        </div>
        <button
          id="refresh-radar"
          onClick={loadData}
          disabled={loading}
          className="sarih-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t('refreshing', language) : t('refreshAnalysis', language)}
        </button>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label={t('burnRate', language)}
          value={fs?.burn_rate !== null && fs?.burn_rate !== undefined ? fmt(fs.burn_rate) : null}
          suffix={t('perMonth', language)}
          signal={fs?.burn_rate && fs.burn_rate > 0 ? 'risk' : 'stable'}
        />
        <MetricTile
          label={t('cashRunway', language)}
          value={fs?.runway_months !== null && fs?.runway_months !== undefined ? fmt(fs.runway_months, 1) : null}
          suffix={t('months', language)}
          signal={getRunwaySignal(fs?.runway_months ?? null)}
        />
        <MetricTile
          label={t('revenueGrowth', language)}
          value={
            fs?.revenue_growth_rate !== null && fs?.revenue_growth_rate !== undefined
              ? `${(fs.revenue_growth_rate * 100).toFixed(1)}%`
              : null
          }
          signal={getGrowthSignal(fs?.revenue_growth_rate ?? null)}
        />
        <MetricTile
          label={t('netWorkingCapital', language)}
          value={fs?.net_working_capital !== null && fs?.net_working_capital !== undefined ? fmt(fs.net_working_capital) : null}
          signal={
            fs?.net_working_capital === null || fs?.net_working_capital === undefined
              ? 'neutral'
              : fs.net_working_capital >= 0
                ? 'stable'
                : 'critical'
          }
        />
      </div>

      {/* Additional detail */}
      {fs && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sarih-card p-4">
            <p className="sarih-label mb-1">Cash Position</p>
            <p className="text-[20pt] font-light text-text-primary leading-none">
              {fs.cash_position !== null ? fmt(fs.cash_position) : '--'}
            </p>
          </div>
          <div className="sarih-card p-4">
            <p className="sarih-label mb-1">Receivables Ratio</p>
            <p className="text-[20pt] font-light text-text-primary leading-none">
              {fs.receivables_ratio !== null ? `${(fs.receivables_ratio * 100).toFixed(1)}%` : '--'}
            </p>
          </div>
          <div className="sarih-card p-4">
            <p className="sarih-label mb-1">Profitable</p>
            <p className={`text-[20pt] font-light leading-none ${
              fs.is_profitable === null ? 'text-text-muted' :
              fs.is_profitable ? 'text-signal-stable' : 'text-signal-critical'
            }`}>
              {fs.is_profitable === null ? '--' : fs.is_profitable ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      )}

      {/* No data state */}
      {!fs && !loading && (
        <div className="sarih-card p-10 text-center">
          <p className="text-text-muted text-sm">{t('noDataYet', language)}</p>
          <p className="text-[8pt] text-text-muted mt-1">{t('uploadToStart', language)}</p>
        </div>
      )}
    </div>
  )
}
