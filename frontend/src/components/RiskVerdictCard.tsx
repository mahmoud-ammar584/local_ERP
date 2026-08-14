'use client'

import { t } from '@/lib/i18n'
import type { EngineVerdict } from '@/lib/api'

interface RiskVerdictCardProps {
  verdict: EngineVerdict
  language: 'en' | 'ar'
}

function SeverityBadge({ severity }: { severity: 'stable' | 'risk' | 'critical' }) {
  const classes: Record<string, string> = {
    stable: 'sarih-pill-stable',
    risk: 'sarih-pill-amber',
    critical: 'sarih-pill-critical',
  }
  const labels: Record<string, string> = {
    stable: 'STABLE',
    risk: 'AT RISK',
    critical: 'CRITICAL',
  }
  return <span className={classes[severity]}>{labels[severity]}</span>
}

export function RiskVerdictCard({ verdict, language }: RiskVerdictCardProps) {
  const borderColors: Record<string, string> = {
    stable: 'border-signal-stable',
    risk: 'border-signal-amber',
    critical: 'border-signal-critical',
  }

  const steps = [
    { key: 'fact',   label: t('fact', language),   value: verdict.fact,   color: 'text-text-muted' },
    { key: 'cause',  label: t('cause', language),  value: verdict.cause,  color: 'text-signal-risk' },
    { key: 'risk',   label: t('risk', language),   value: verdict.risk,   color: 'text-signal-critical' },
    { key: 'action', label: t('action', language), value: verdict.action, color: 'text-signal-stable' },
  ]

  return (
    <div className={`sarih-card border-l-2 ${borderColors[verdict.severity] || 'border-signal-amber'} p-5 space-y-4`}>
      {/* Verdict header */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="sarih-verdict">{verdict.title}</h3>
        <SeverityBadge severity={verdict.severity} />
      </div>

      {/* The 4-step structure */}
      <div className="grid grid-cols-4 gap-0 border border-void-border rounded-sm overflow-hidden">
        {steps.map(({ key, label, value, color }, i) => (
          <div
            key={key}
            className={`p-3 bg-void-card2 ${i < 3 ? 'border-r border-void-border' : ''}`}
          >
            <div className="sarih-label mb-2">{label}</div>
            <p className={`text-[8.5pt] leading-relaxed ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2">
        <div className="h-1 bg-void-border rounded-full flex-1">
          <div
            className="h-1 bg-signal-amber rounded-full transition-all"
            style={{ width: `${(verdict.confidence * 100).toFixed(0)}%` }}
          />
        </div>
        <span className="text-[8pt] text-text-muted">
          {(verdict.confidence * 100).toFixed(0)}% confidence
        </span>
      </div>
    </div>
  )
}
