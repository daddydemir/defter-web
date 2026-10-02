import { useState } from 'react'
import { ArchiveRestore, Menu, Trash2 } from 'lucide-react'
import type { TrashItem } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { timeAgo } from '../lib/format'

type Props = {
  items: TrashItem[]
  onRestore: (item: TrashItem) => Promise<void>
  onDelete: (item: TrashItem) => Promise<void>
  onOpenSidebar: () => void
}

export function TrashView({ items, onRestore, onDelete, onOpenSidebar }: Props) {
  const [pending, setPending] = useState<string | null>(null)
  const [confirmItem, setConfirmItem] = useState<TrashItem | null>(null)

  const run = async (id: string, action: () => Promise<void>) => {
    setPending(id)
    try {
      await action()
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-start gap-3 border-b border-edge px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-4">
        <button
          onClick={onOpenSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sub hover:bg-surface2 hover:text-ink lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-ink">Çöp kutusu</h1>
          <p className="mt-1 text-xs text-sub">Silinen notlar kayıpsız olarak sıkıştırılır ve buradan geri yüklenebilir.</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:p-8">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sub">
            <Trash2 className="h-10 w-10 opacity-30" />
            <p className="text-sm">Çöp kutusu boş</p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-3">
            {items.map((item) => {
              const saved = item.originalSize > 0
                ? Math.max(0, Math.round((1 - item.compressedSize / item.originalSize) * 100))
                : 0
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-edge bg-surface p-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-medium text-ink">{item.title || 'Başlıksız not'}</h2>
                    <p className="mt-1 text-xs text-sub">
                      {timeAgo(item.deletedAt)} silindi · Brotli ile %{saved} küçültüldü
                    </p>
                  </div>
                  <button
                    disabled={pending === item.id}
                    onClick={() => void run(item.id, () => onRestore(item))}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    title="Geri yükle"
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    <span className="hidden sm:inline">Geri yükle</span>
                  </button>
                  <button
                    disabled={pending === item.id}
                    onClick={() => setConfirmItem(item)}
                    className="rounded-lg p-2 text-sub hover:bg-surface2 hover:text-red-500 disabled:opacity-50"
                    title="Kalıcı olarak sil"
                    aria-label="Kalıcı olarak sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmItem !== null}
        title="Kalıcı olarak silinsin mi?"
        message={`“${confirmItem?.title || 'Başlıksız not'}” artık geri yüklenemez.`}
        onConfirm={() => {
          if (!confirmItem) return
          const item = confirmItem
          setConfirmItem(null)
          void run(item.id, () => onDelete(item))
        }}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  )
}
