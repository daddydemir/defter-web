import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Friend, Permission, ShareEntry } from '../types'
import { copyText } from '../lib/clipboard'
import { Check, ChevronDown, Link2, Loader2, Plus, X } from 'lucide-react'

export function ShareDialog({
  open,
  noteId,
  shareToken,
  onShareTokenChange,
  onClose,
}: {
  open: boolean
  noteId: string
  shareToken: string | null
  onShareTokenChange: (token: string | null) => void
  onClose: () => void
}) {
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [selected, setSelected] = useState<string>('')
  const [permission, setPermission] = useState<Permission>('view')
  const [busy, setBusy] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const [s, f] = await Promise.all([api.listShares(noteId), api.listFriends()])
      setShares(s)
      setFriends(f)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  useEffect(() => {
    if (!open) return
    setSelected('')
    setPermission('view')
    setNotice(null)
    setCopied(false)
    load()
  }, [open, noteId])

  const flash = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2500)
  }

  const linkUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null

  const enableLink = async () => {
    setLinkBusy(true)
    setError(null)
    try {
      const r = await api.enableNoteShare(noteId)
      onShareTokenChange(r.shareToken)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLinkBusy(false)
    }
  }

  const disableLink = async () => {
    setLinkBusy(true)
    setError(null)
    try {
      await api.disableNoteShare(noteId)
      onShareTokenChange(null)
      setCopied(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLinkBusy(false)
    }
  }

  const copyLink = async () => {
    if (!linkUrl) return
    const ok = await copyText(linkUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }
  }

  const addShare = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.addShare(noteId, selected, permission)
      setShares((list) => [
        ...list,
        {
          id: r.id,
          userId: selected,
          username: friends.find((f) => f.userId === selected)?.username ?? '',
          permission: r.permission,
          createdAt: new Date().toISOString(),
        },
      ])
      setSelected('')
      flash('Not paylaşıldı')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const changePermission = async (shareId: string, p: Permission) => {
    setError(null)
    try {
      await api.updateShare(noteId, shareId, p)
      setShares((list) => list.map((s) => (s.id === shareId ? { ...s, permission: p } : s)))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const removeShare = async (shareId: string) => {
    setError(null)
    try {
      await api.removeShare(noteId, shareId)
      setShares((list) => list.filter((s) => s.id !== shareId))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!open) return null

  const available = friends.filter((f) => !shares.some((s) => s.userId === f.userId))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="dialog-backdrop-enter absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="dialog-enter relative flex h-dvh w-full flex-col overflow-hidden bg-surface shadow-2xl sm:h-auto sm:max-h-[75dvh] sm:w-[26rem] sm:rounded-2xl sm:border sm:border-edge">
        <header className="flex shrink-0 items-center gap-2 border-b border-edge px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="text-base font-semibold text-ink">Notu Paylaş</h2>
          <button
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {notice && (
            <div className="mb-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>
          )}

          <div className="mb-4 rounded-xl border border-edge p-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-sub" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">Bağlantıyla paylaş</p>
                <p className="text-[11px] text-sub">Bağlantısı olan herkes bu notu görüntüleyebilir.</p>
              </div>
            </div>

            {linkUrl ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={linkUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 truncate rounded-lg border border-edge bg-surface2 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                  />
                  <button
                    onClick={copyLink}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    title="Bağlantıyı kopyala"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
                <button
                  onClick={disableLink}
                  disabled={linkBusy}
                  className="text-xs font-medium text-red-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  {linkBusy ? 'Kapatılıyor…' : 'Bağlantıyı kapat'}
                </button>
              </div>
            ) : (
              <button
                onClick={enableLink}
                disabled={linkBusy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {linkBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Bağlantıyı etkinleştir
              </button>
            )}
          </div>

          {shares.length === 0 && (
            <p className="py-6 text-center text-sm text-sub/70">
              Henüz kimseyle paylaşılmamış. Arkadaşlarınızı seçip paylaşabilirsiniz.
            </p>
          )}

          <div className="space-y-1">
            {shares.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {s.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.username}</span>
                <div className="relative shrink-0">
                  <select
                    value={s.permission}
                    onChange={(e) => changePermission(s.id, e.target.value as Permission)}
                    className="appearance-none rounded-lg border border-edge bg-surface2 py-1.5 pl-2.5 pr-7 text-xs font-medium text-ink outline-none transition-colors focus:border-accent"
                    title="İzin"
                  >
                    <option value="view">Görüntüle</option>
                    <option value="edit">Düzenle</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-sub" />
                </div>
                <button
                  onClick={() => removeShare(s.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-red-500"
                  title="Paylaşımı kaldır"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>

          {available.length > 0 && (
            <div className="mt-4 border-t border-edge pt-3">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-sub/70">
                Arkadaş ekle
              </p>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="w-full appearance-none truncate rounded-lg border border-edge bg-surface2 py-2 pl-3 pr-8 text-sm text-ink outline-none transition-colors focus:border-accent"
                  >
                    <option value="">Arkadaş seç…</option>
                    {available.map((f) => (
                      <option key={f.userId} value={f.userId}>
                        {f.username}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
                </div>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as Permission)}
                  className="shrink-0 appearance-none rounded-lg border border-edge bg-surface2 px-2.5 py-2 text-xs font-medium text-ink outline-none transition-colors focus:border-accent"
                  title="İzin"
                >
                  <option value="view">Görüntüle</option>
                  <option value="edit">Düzenle</option>
                </select>
                <button
                  onClick={addShare}
                  disabled={busy || !selected}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Paylaş
                </button>
              </div>
            </div>
          )}

          {available.length === 0 && friends.length > 0 && (
            <p className="mt-4 border-t border-edge px-1 pt-3 text-center text-xs text-sub/70">
              Tüm arkadaşlarınız bu notla paylaşılıyor.
            </p>
          )}
          {friends.length === 0 && (
            <p className="mt-4 border-t border-edge px-1 pt-3 text-center text-xs text-sub/70">
              Paylaşmak için önce arkadaş ekleyin. (Kenar çubuğundaki "Arkadaşlar" bölümü)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}