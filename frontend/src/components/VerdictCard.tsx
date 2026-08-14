'use client'

import { getSignalBorder } from '@/lib/utils'

interface VerdictItem {
  label: string
  value: string
  signal: 'stable' | 'risk' | 'critical'
}

interface VerdictCardProps {
  title: string
  items: VerdictItem[]
  signal: 'stable' | 'risk' | 'critical'
}

export function VerdictCard({ title, items, signal }: VerdictCardProps) {
  const borderClass = getSignalBorder(signal)
  const signalColors: Record<string, string> = {
    stable: 'text-signal-stable',
    risk: 'text-signal-risk',
    critical: 'text-signal-critical',
  }

  const pillClass: Record<string, string> = {
    stable: 'sarih-pill-stable',
    risk: 'sarih-pill-amber',
    critical: 'sarih-pill-critical',
  }

  return (
    <div className={`sarih-card border-l-2 ${borderClass} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span className={pillClass[signal] || 'sarih-pill-amber'}>
          {signal.toUpperCase()}
        </span>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-void-border last:border-0">
              <span className="text-[9pt] text-text-muted truncate max-w-[60%]">{item.label}</span>
              <span className={`text-[9pt] font-medium ${signalColors[item.signal] || 'text-text-primary'}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[8pt] text-text-muted">No items.</p>
      )}
    </div>
  )
}
