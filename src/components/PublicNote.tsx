import { useEffect, useState } from 'react'
import { api } from '../api'
import type { PublicNote as PublicNoteData } from '../types'
import { timeAgo } from '../lib/format'
import { Logo } from './Logo'
import { Markdown } from './Markdown'

export function PublicNote({ token }: { token: string }) {
  const [note, setNote] = useState<PublicNoteData | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="flex min-h-dvh flex-col bg-base text-ink">
      <header className="sticky top-0 z-10 border-b border-edge bg-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-[46rem] items-center gap-2 px-4 py-3">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight">Notes</span>
          <a
            href="/"
            className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink"
          >
            Notlarıma dön →
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[46rem] flex-1 px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom))]">
        {error ? (
          <div className="rounded-xl border border-edge bg-surface px-5 py-10 text-center">
            <p className="text-sm text-sub">Bu not bulunamadı ya da paylaşım bağlantısı kapatılmış.</p>
            <a
              href="/"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Notes'a git
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