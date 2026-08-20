import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImageIcon, X } from 'lucide-react'

interface ImageDialogProps {
  open: boolean
  onInsert: (image: { src: string; alt: string; width?: number }) => void
  onCancel: () => void
}

export function ImageDialog({ open, onInsert, onCancel }: ImageDialogProps) {
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const [width, setWidth] = useState('')
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSrc('')
    setAlt('')
    setWidth('')
    const t = setTimeout(() => urlRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const widthNum = parseInt(width, 10)
  const canSubmit = src.trim().length > 0 && (!width.trim() || Number.isFinite(widthNum) && widthNum > 0)

  const submit = () => {
    if (!canSubmit) return
    onInsert({
      src: src.trim(),
      alt: alt.trim(),
      width: width.trim() ? widthNum : undefined,
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Görsel ekle"
    >
      <div className="dialog-backdrop-enter absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="dialog-enter relative w-full max-w-md rounded-2xl border border-edge bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface2 text-sub">
              <ImageIcon className="h-4 w-4" />
            </span>
            Görsel ekle
          </h2>
          <button
            onClick={onCancel}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {src.trim() && (
          <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-edge bg-surface2">
            {src.trim() ? (
              <img
                src={src.trim()}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
                onLoad={(e) => {
                  ;(e.target as HTMLImageElement).style.display = ''
                }}
              />
            ) : (
              <span className="text-xs text-sub">Görsel önizlemesi</span>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-sub">Görsel adresi (URL) *</span>
            <input
              ref={urlRef}
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="https://ornek.com/resim.png"
              className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-sub/50 focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-sub">Alternatif metin</span>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Resim açıklaması"
              className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-sub/50 focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-sub">Genişlik (px) — boş bırakılırsa orijinal boyut</span>
            <input
              value={width}
              onChange={(e) => setWidth(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              inputMode="numeric"
              placeholder="Örn. 600"
              className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-sub/50 focus:border-accent"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
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
            Ekle
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}