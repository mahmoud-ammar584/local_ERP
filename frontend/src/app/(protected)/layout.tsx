'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getAccessToken, setWorkspaceId, getWorkspaceId } from '@/lib/auth'
import { fetchJson } from '@/lib/http'
import { useLanguage } from '@/lib/i18n'
import { Navbar } from '@/components/Navbar'
import type { Workspace } from '@/lib/api'

type Phase = 'checking' | 'unauthenticated' | 'select-workspace' | 'ready'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const [phase, setPhase] = useState<Phase>('checking')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [newWsName, setNewWsName] = useState('')

  const bootstrap = useCallback(async () => {
    if (!isAuthenticated()) {
      setPhase('unauthenticated')
      return
    }

    try {
      const data = await fetchJson<Workspace[] | { results: Workspace[] }>(
        '/api/v1/workspaces/',
        { method: 'GET' }
      )
      const list = Array.isArray(data) ? data : data.results ?? []
      setWorkspaces(list)

      const savedId = getWorkspaceId()
      const match = savedId ? list.find(w => w.id === savedId) : null

      if (match) {
        setWorkspaceName(match.name)
        setPhase('ready')
      } else if (list.length === 1) {
        setWorkspaceId(list[0].id)
        setWorkspaceName(list[0].name)
        setPhase('ready')
      } else if (list.length > 1) {
        setPhase('select-workspace')
      } else {
        setPhase('select-workspace')
      }
    } catch {
      setPhase('unauthenticated')
    }
  }, [])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (phase === 'unauthenticated') router.push('/login')
  }, [phase, router])

  function selectWorkspace(ws: Workspace) {
    setWorkspaceId(ws.id)
    setWorkspaceName(ws.name)
    setPhase('ready')
  }

  async function createWorkspace() {
    if (!newWsName.trim()) return
    setCreating(true)
    try {
      const ws = await fetchJson<Workspace>('/api/v1/workspaces/', {
        method: 'POST',
        body: JSON.stringify({ name: newWsName.trim() }),
      })
      setWorkspaceId(ws.id)
      setWorkspaceName(ws.name)
      setPhase('ready')
    } catch {
      /* show nothing — silent fail for now */
    } finally {
      setCreating(false)
    }
  }

  function handleLangToggle() {
    setLanguage(language === 'ar' ? 'en' : 'ar')
  }

  /* ── LOADING ────────────────────────── */
  if (phase === 'checking' || phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-void-border border-t-signal-amber rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[9pt] text-text-muted">Authenticating…</p>
        </div>
      </div>
    )
  }

  /* ── WORKSPACE SELECTION ────────────── */
  if (phase === 'select-workspace') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="w-full max-w-[400px]">
          <div className="text-[7pt] font-bold tracking-[0.18em] text-signal-amber mb-3 uppercase">
            صريح  ·  SARIH
          </div>
          <h1 className="text-[20pt] font-semibold text-text-primary mb-6">
            Select workspace.
          </h1>

          {workspaces.length > 0 && (
            <div className="space-y-2 mb-6">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => selectWorkspace(ws)}
                  className="w-full sarih-card p-4 text-left hover:border-[#444] transition-colors"
                >
                  <p className="text-sm text-text-primary font-medium">{ws.name}</p>
                  <p className="text-[8pt] text-text-muted mt-0.5">{ws.role}</p>
                </button>
              ))}
            </div>
          )}

          <div className="sarih-divider my-4" />

          <div className="flex gap-2">
            <input
              id="new-workspace-name"
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              placeholder="New workspace name"
              className="sarih-input flex-1"
            />
            <button
              id="create-workspace-btn"
              onClick={createWorkspace}
              disabled={creating || !newWsName.trim()}
              className="sarih-btn-primary"
            >
              {creating ? '...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── READY ──────────────────────────── */
  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar
        workspaceName={workspaceName}
        onLangToggle={handleLangToggle}
      />
      <main className="max-w-6xl mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  )
}
