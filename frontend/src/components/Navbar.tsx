'use client'

import { useLanguage, t } from '@/lib/i18n'
import { clearTokens } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  workspaceName?: string
  onLangToggle?: () => void
}

export function Navbar({ workspaceName, onLangToggle }: NavbarProps) {
  const { language } = useLanguage()
  const router = useRouter()

  function handleSignOut() {
    clearTokens()
    router.push('/login')
  }

  return (
    <header className="
      sticky top-0 z-50
      h-11
      bg-void-card border-b border-void-border
      flex items-center justify-between
      px-5
    ">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        {/* Amber viewfinder mark */}
        <div className="relative w-5 h-5 flex-shrink-0">
          <div className="absolute inset-0 border border-signal-amber/60 rounded-[1px]" />
          <div className="absolute top-[3px] right-[3px] w-[6px] h-[6px] bg-signal-amber rounded-[1px]" />
        </div>
        <span className="text-[9pt] font-bold tracking-[0.12em] text-text-primary">
          SARIH
        </span>
        {workspaceName && (
          <>
            <span className="text-void-border text-[10pt]">·</span>
            <span className="text-[9pt] text-text-muted truncate max-w-[160px]">
              {workspaceName}
            </span>
          </>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1">
        {onLangToggle && (
          <button
            id="lang-toggle"
            onClick={onLangToggle}
            className="px-2.5 py-1 text-[8pt] font-bold tracking-wide text-text-muted
                       hover:text-text-primary hover:bg-void-zinc
                       rounded-sm transition-colors"
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>
        )}
        <div className="w-px h-4 bg-void-border mx-1" />
        <button
          id="sign-out-btn"
          onClick={handleSignOut}
          className="px-2.5 py-1 text-[8pt] text-text-muted
                     hover:text-signal-critical hover:bg-[#1A0000]
                     rounded-sm transition-colors"
        >
          {t('signOut', language)}
        </button>
      </div>
    </header>
  )
}
