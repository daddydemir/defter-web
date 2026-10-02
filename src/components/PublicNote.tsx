import { useEffect, useState } from 'react'
import { api } from '../api'
import type { PublicNote as PublicNoteData } from '../types'
import { cn, timeAgo } from '../lib/format'
import { Logo } from './Logo'
import { Markdown } from './Markdown'
import { Maximize2, Minimize2 } from 'lucide-react'

export function PublicNote({ token }: { token: string }) {
  const [note, setNote] = useState<PublicNoteData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [readingFullscreen, setReadingFullscreen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setNote(null)
    api
      .fetchPublicNote(token)
      .then((n) => {
        if (!cancelled) setNote(n)
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // Sekme başlığı: "Defter | not başlığı"
  useEffect(() => {
    document.title = note ? `Defter | ${note.title.trim() || 'Başlıksız'}` : 'Defter'
    return () => {
      document.title = 'Defter'
    }
  }, [note])

  useEffect(() => {
    if (!readingFullscreen) return
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReadingFullscreen(false)
    }
    window.addEventListener('keydown', exitOnEscape)
    return () => window.removeEventListener('keydown', exitOnEscape)
  }, [readingFullscreen])

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-base text-ink',
        readingFullscreen && 'fixed inset-0 z-[60] overflow-y-auto',
      )}
    >
      <header className="sticky top-0 z-10 border-b border-edge bg-base/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[68rem] items-center gap-2 px-5 py-3 md:px-8 xl:px-10">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight">Defter</span>
          <button
            type="button"
            onClick={() => setReadingFullscreen((current) => !current)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label={readingFullscreen ? 'Tam ekran okumadan çık' : 'Tam ekran oku'}
            title={readingFullscreen ? 'Tam ekrandan çık' : 'Tam ekran oku'}
            aria-pressed={readingFullscreen}
          >
            {readingFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <a
            href="/"
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink',
              readingFullscreen && 'hidden',
            )}
          >
            Notlarıma dön →
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[68rem] flex-1 px-5 py-8 pb-[max(3rem,env(safe-area-inset-bottom))] md:px-8 xl:px-10">
        {error ? (
          <div className="rounded-xl border border-edge bg-surface px-5 py-10 text-center">
            <p className="text-sm text-sub">Bu not bulunamadı ya da paylaşım bağlantısı kapatılmış.</p>
            <a
              href="/"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Defter'e git
            </a>
          </div>
        ) : !note ? (
          <div className="py-10 text-center text-sm text-sub">Yükleniyor…</div>
        ) : (
          <article>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {note.title || 'Başlıksız'}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-xs text-sub">
              <span className="font-medium text-ink">{note.username}</span>
              <span>·</span>
              <span>{timeAgo(note.updatedAt)}</span>
            </p>
            <div className="mt-6">
              {note.content.trim() ? (
                <Markdown>{note.content}</Markdown>
              ) : (
                <p className="text-sm text-sub/60">Bu not boş.</p>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  )
}
