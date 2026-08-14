'use client'

import { t } from '@/lib/i18n'
import type { FinancialStateResponse } from '@/lib/api'

interface FinancialStatePanelProps {
  state: FinancialStateResponse
  language: 'en' | 'ar'
}

function fmt(n: number | null, decimals = 0): string {
  if (n === null || n === undefined) return '--'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export function FinancialStatePanel({ state, language }: FinancialStatePanelProps) {
  const metrics = [
    {
      label: t('burnRate', language),
      value: state.burn_rate !== null ? fmt(state.burn_rate) : '--',
      suffix: t('perMonth', language),
      warning: state.burn_rate !== null && state.burn_rate > 0,
    },
    {
      label: t('cashRunway', language),
      value: state.runway_months !== null ? fmt(state.runway_months, 1) : '--',
      suffix: t('months', language),
      warning: state.runway_months !== null && state.runway_months < 6,
    },
    {
      label: t('revenueGrowth', language),
      value: state.revenue_growth_rate !== null
        ? `${(state.revenue_growth_rate * 100).toFixed(1)}%`
        : '--',
      suffix: '',
      warning: state.revenue_growth_rate !== null && state.revenue_growth_rate < 0,
    },
    {
      label: t('netWorkingCapital', language),
      value: state.net_working_capital !== null ? fmt(state.net_working_capital) : '--',
      suffix: '',
      warning: state.net_working_capital !== null && state.net_working_capital < 0,
    },
  ]

  return (
    <div>
      <div className="sarih-label mb-3">{t('keyMetrics', language)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="sarih-card p-4 space-y-1">
            <p className="sarih-label">{m.label}</p>
            <p className={`text-[28pt] font-light leading-none ${
              m.warning ? 'text-signal-amber' : 'text-text-primary'
            }`}>
              {m.value}
              {m.suffix && (
                <span className="text-[9pt] text-text-muted ml-1.5">{m.suffix}</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
