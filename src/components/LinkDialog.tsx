import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link2, Unlink, X } from 'lucide-react'

interface LinkDialogProps {
  open: boolean
  initialUrl: string
  canRemove: boolean
  onApply: (url: string, text: string) => void
  onRemove: () => void
  onCancel: () => void
}

export function LinkDialog({ open, initialUrl, canRemove, onApply, onRemove, onCancel }: LinkDialogProps) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setUrl(initialUrl)
    setText('')
    const t = setTimeout(() => {
      urlRef.current?.focus()
      urlRef.current?.select()
    }, 50)
    return () => clearTimeout(t)
  }, [open, initialUrl])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const canSubmit = url.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    onApply(url.trim(), text.trim())
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bağlantı ekle"
    >
      <div className="dialog-backdrop-enter absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="dialog-enter relative w-full max-w-md rounded-2xl border border-edge bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface2 text-sub">
              <Link2 className="h-4 w-4" />
            </span>
            Bağlantı ekle
          </h2>
          <button
            onClick={onCancel}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-sub">Bağlantı adresi (URL) *</span>
            <input
              ref={urlRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="https://ornek.com"
              className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-sub/50 focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-sub">Metin</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="Boşsa seçili metne uygulanır"
              className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-sub/50 focus:border-accent"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {canRemove && (
            <button
              onClick={onRemove}
              className="mr-auto flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-sub transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <Unlink className="h-4 w-4" />
              Bağlantıyı kaldır
            </button>
          )}
          <button
            onClick={onCancel}
            className="min-h-10 rounded-lg px-3.5 py-2 text-sm font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink"
          >
            Vazgeç
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="min-h-10 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}