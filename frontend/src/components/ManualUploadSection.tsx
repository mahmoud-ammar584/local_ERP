'use client'

import { useState, useRef, useCallback } from 'react'
import { t } from '@/lib/i18n'
import { validateUpload, importUpload, getJobStatus } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface ManualUploadSectionProps {
  language: 'en' | 'ar'
  onUploadComplete?: () => void
}

type UploadPhase = 'idle' | 'validating' | 'preview' | 'importing' | 'done' | 'error'

export function ManualUploadSection({ language, onUploadComplete }: ManualUploadSectionProps) {
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setPhase('validating')
    setErrors([])
    setWarnings([])

    try {
      const result = await validateUpload(f)
      if (!result.valid) {
        setErrors(result.errors || ['Validation failed.'])
        setPhase('error')
        return
      }
      setWarnings(result.warnings || [])
      setUploadId(result.upload_id || null)
      setPhase('preview')
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Validation failed.'])
      setPhase('error')
    }
  }, [])

  async function handleImport() {
    if (!uploadId) return
    setPhase('importing')
    try {
      const { job_id } = await importUpload(uploadId)
      // Poll for completion
      let attempts = 0
      const poll = async () => {
        const status = await getJobStatus(job_id)
        if (status.status === 'done' || status.status === 'completed') {
          setPhase('done')
          onUploadComplete?.()
        } else if (status.status === 'error') {
          setErrors([status.error || 'Import failed.'])
          setPhase('error')
        } else if (attempts < 30) {
          attempts++
          setTimeout(poll, 2000)
        } else {
          setErrors(['Import timed out.'])
          setPhase('error')
        }
      }
      await poll()
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Import failed.'])
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle')
    setFile(null)
    setUploadId(null)
    setErrors([])
    setWarnings([])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  return (
    <div className="sarih-card p-5">
      <div className="sarih-label mb-3">{t('uploadData', language)}</div>

      {/* Drop zone — idle or error */}
      {(phase === 'idle' || phase === 'error') && (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={cn(
              "border border-dashed border-void-border rounded-card p-10",
              "flex flex-col items-center justify-center gap-3 cursor-pointer",
              "hover:border-[#444] transition-colors",
              isDragging && "border-signal-amber bg-[#1A0D00]/30"
            )}
          >
            <Upload className="h-6 w-6 text-text-muted" />
            <div className="text-center">
              <p className="text-sm text-text-muted">{t('dragDrop', language)}</p>
              <p className="text-[8pt] text-text-muted mt-1">CSV or XLSX · Max 10MB</p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {errors.length > 0 && (
            <div className="mt-3 p-3 border border-signal-critical/40 bg-[#1A0000] rounded-sm">
              {errors.map((err, i) => (
                <p key={i} className="text-[9pt] text-signal-critical flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {err}
                </p>
              ))}
              <button onClick={reset} className="sarih-btn mt-2 text-[8pt]">
                Try Again
              </button>
            </div>
          )}
        </>
      )}

      {/* Validating */}
      {phase === 'validating' && (
        <div className="flex items-center gap-3 p-6">
          <div className="w-5 h-5 border-2 border-void-border border-t-signal-amber rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Validating {file?.name}…</p>
        </div>
      )}

      {/* Preview */}
      {phase === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-signal-stable" />
            <p className="text-sm text-text-primary">
              <strong>{file?.name}</strong> is valid.
            </p>
          </div>
          {warnings.length > 0 && (
            <div className="p-2 border border-signal-risk/30 bg-[#1A0D00] rounded-sm">
              {warnings.map((w, i) => (
                <p key={i} className="text-[8pt] text-signal-risk">⚠ {w}</p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleImport} className="sarih-btn-primary">
              Import Data
            </button>
            <button onClick={reset} className="sarih-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Importing */}
      {phase === 'importing' && (
        <div className="flex items-center gap-3 p-6">
          <div className="w-5 h-5 border-2 border-void-border border-t-signal-amber rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Importing data…</p>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-signal-stable" />
            <p className="text-sm text-signal-stable">Import complete.</p>
          </div>
          <button onClick={reset} className="sarih-btn">
            Upload Another
          </button>
        </div>
      )}
    </div>
  )
}
