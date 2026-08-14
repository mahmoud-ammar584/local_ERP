import { fetchJson } from './http'
export { ApiError } from './http'

export interface Workspace {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member' | string
  subscription_status: string | null
  subscription_plan: string | null
  current_period_end: string | null
}

export interface Offender {
  customer: string
  gap_amount: number | string
  status: string
  rank: number
}

export interface ConfidenceResult {
  score: number
  label: string
  breakdown?: Record<string, unknown>
}

export interface Signal {
  label: string
  value: string | number
  signal: 'stable' | 'risk' | 'critical' | 'neutral'
}

export interface WeeklyTrend { week: string; value: number }
export interface ExposureAging { bucket: string; amount: number }
export interface NarrativeBlock { type: string; content: string; severity?: string }
export interface DrilldownResponse { kind: string; data: unknown }

export interface DecisionFrame {
  id: string
  title: string
  verdict: string
  evidence: unknown[]
  recommended_action: string
}

export interface ValidateResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
  preview?: unknown
  upload_id?: string
}

export interface StalledCashItem {
  client_name: string
  total_stalled_amount: number
  [key: string]: unknown
}

export interface OrphanPaymentItem {
  client_name: string
  total_orphan_amount: number
  [key: string]: unknown
}

export interface RefundSpikeItem {
  client_name: string
  refund_ratio: string
  [key: string]: unknown
}

export interface Verdict {
  has_data: boolean
  confidence: ConfidenceResult | null
  source_mode: 'daftra_only' | 'manual_only' | 'mixed' | null
  inputs_metadata?: unknown
  verdicts: {
    stalled_cash?: StalledCashItem[]
    orphan_payments?: OrphanPaymentItem[]
    refund_spikes?: RefundSpikeItem[]
    cfo_insights?: string[]
    [key: string]: unknown
  }
}

export interface EngineVerdict {
  id: string
  title: string
  fact: string
  cause: string
  risk: string
  action: string
  severity: 'stable' | 'risk' | 'critical'
  confidence: number
}

export interface FinancialStateResponse {
  cash_position: number | null
  burn_rate: number | null
  runway_months: number | null
  revenue_growth_rate: number | null
  receivables_ratio: number | null
  is_profitable: boolean | null
  net_working_capital: number | null
  [key: string]: unknown
}

export interface EngineResponse {
  financial_state: FinancialStateResponse | null
  verdicts: EngineVerdict[]
  [key: string]: unknown
}

export interface DaftraConnectionStatus {
  status: 'connected' | 'disconnected'
  subdomain?: string
  masked_token?: string
  last_synced_at?: string
  [key: string]: unknown
}

export interface SyncStatus {
  status: 'pending' | 'running' | 'done' | 'error'
  [key: string]: unknown
}

export const fetchVerdicts = () =>
  fetchJson<Verdict>('/api/v1/integrations/verdicts/')

export const fetchEngineVerdicts = () =>
  fetchJson<EngineResponse>('/api/v1/engine/verdicts/')

export const getSyncStatus = () =>
  fetchJson<SyncStatus>('/api/v1/integrations/sync/')

export function validateUpload(file: File): Promise<ValidateResult> {
  const form = new FormData()
  form.append('file', file)
  return fetchJson<ValidateResult>('/api/v1/manual/validate/', {
    method: 'POST',
    body: form,
    headers: {},
  })
}

export const importUpload = (uploadId: string) =>
  fetchJson<{ job_id: string }>('/api/v1/manual/import/', {
    method: 'POST',
    body: JSON.stringify({ upload_id: uploadId }),
  })

export const getJobStatus = (jobId: string) =>
  fetchJson<{ status: string; error?: string }>(`/api/v1/manual/jobs/${jobId}/`)

export const getDaftraStatus = () =>
  fetchJson<DaftraConnectionStatus>('/api/v1/integrations/daftra/status/')

export const connectDaftra = (subdomain: string, apiKey: string) =>
  fetchJson('/api/v1/integrations/daftra/connect/', {
    method: 'POST',
    body: JSON.stringify({ subdomain, api_key: apiKey }),
  })

export const testDaftra = () =>
  fetchJson<{ ok: boolean; detail?: string }>('/api/v1/integrations/daftra/test/', {
    method: 'POST',
  })

export const disconnectDaftra = () =>
  fetchJson('/api/v1/integrations/daftra/disconnect/', { method: 'DELETE' })

export const triggerSync = () =>
  fetchJson('/api/v1/integrations/sync/', { method: 'POST' })

export const fetchDrilldown = (kind: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return fetchJson<DrilldownResponse>(`/api/v1/drilldown/?kind=${kind}${qs}`)
}
