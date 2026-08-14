import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSignalColor(signal: string): string {
  switch (signal) {
    case 'stable':   return 'text-signal-stable'
    case 'risk':     return 'text-signal-risk'
    case 'critical': return 'text-signal-critical'
    default:         return 'text-text-primary'
  }
}

export function getSignalGlow(signal: string): string {
  switch (signal) {
    case 'stable':   return 'shadow-[0_0_12px_rgba(16,185,129,0.25)]'
    case 'risk':     return 'shadow-[0_0_12px_rgba(245,158,11,0.25)]'
    case 'critical': return 'shadow-[0_0_12px_rgba(225,29,72,0.25)]'
    default:         return ''
  }
}

export function getSignalBorder(signal: string): string {
  switch (signal) {
    case 'stable':   return 'border-signal-stable'
    case 'risk':     return 'border-signal-risk'
    case 'critical': return 'border-signal-critical'
    default:         return 'border-void-border'
  }
}

export function formatPercent(raw: string | number): string {
  const num = parseFloat(String(raw)) * 100
  if (isNaN(num)) return '--'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(1)}%`
}
