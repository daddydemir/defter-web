import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Friend, FriendRequests, FriendSearchResult } from '../types'
import { cn } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'
import { Check, Loader2, Search, UserPlus, X } from 'lucide-react'

type Tab = 'friends' | 'requests' | 'add'

export function FriendsDialog({
  open,
  initialTab = 'friends',
  onClose,
  onCountChange,
}: {
  open: boolean
  initialTab?: Tab
  onClose: () => void
  onCountChange?: (count: number) => void
}) {
  const [tab, setTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Friend | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const initialTabRef = useRef(initialTab)
  initialTabRef.current = initialTab

  const load = async () => {
    setError(null)
    try {
      const [f, r] = await Promise.all([api.listFriends(), api.listFriendRequests()])
      setFriends(f)
      setRequests(r)
      onCountChange?.(r.incoming.length)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  useEffect(() => {
    if (!open) return
    setTab(initialTabRef.current)
    setQuery('')
    setResults([])
    setNotice(null)
    load()
  }, [open])

  const flash = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2500)
  }

  const search = async (q: string) => {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    setError(null)
    try {
      setResults(await api.searchUsers(q.trim()))
    } catch (err) {
      setError((err as Error).message)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const sendRequest = async (userId: string) => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.sendFriendRequest(userId)
      setResults((list) => list.map((u) => (u.id === userId ? { ...u, friendship: r.accepted ? 'friends' : 'pending_outgoing' } : u)))
      if (r.accepted) {
        flash('İstek kabul edildi, artık arkadaşsınız')
        await load()
      } else {
        flash('Arkadaşlık isteği gönderildi')
        await load()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const accept = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      await api.acceptFriendRequest(id)
      flash('İstek kabul edildi')
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const decline = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      await api.declineFriendRequest(id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (friend: Friend) => {
    setRemoveTarget(null)
    setBusy(true)
    setError(null)
    try {
      await api.removeFriend(friend.id)
      setFriends((list) => list.filter((f) => f.id !== friend.id))
      flash('Arkadaşlık sonlandırıldı')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const incomingCount = requests.incoming.length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="dialog-backdrop-enter absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="dialog-enter relative flex h-dvh w-full flex-col overflow-hidden bg-surface shadow-2xl sm:h-auto sm:max-h-[75dvh] sm:w-[26rem] sm:rounded-2xl sm:border sm:border-edge">
        <header className="flex shrink-0 items-center gap-2 border-b border-edge px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="text-base font-semibold text-ink">Arkadaşlar</h2>
          <button
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex shrink-0 gap-1 border-b border-edge px-3 pt-2">
          {(
            [
              ['friends', 'Arkadaşlar'],
              ['requests', `İstekler${incomingCount ? ` (${incomingCount})` : ''}`],
              ['add', 'Ekle'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
                tab === key ? 'border-b-2 border-accent text-ink' : 'text-sub hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {notice && (
            <div className="mb-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>
          )}

          {tab === 'friends' && (
            <div className="space-y-1">
              {friends.length === 0 && (
                <p className="py-6 text-center text-sm text-sub/70">
                  Henüz arkadaşınız yok. "Ekle" sekmesinden kişi arayabilirsiniz.
                </p>
              )}
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2/60"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {f.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.username}</span>
                  <button
                    onClick={() => setRemoveTarget(f)}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-red-500"
                  >
                    Çıkar
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'requests' && (
            <div className="space-y-4">
              <section>
                <h3 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-widest text-sub/70">
                  Gelen istekler
                </h3>
                {requests.incoming.length === 0 && (
                  <p className="px-1 py-2 text-sm text-sub/70">Bekleyen gelen istek yok.</p>
                )}
                {requests.incoming.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2/60"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {r.user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.user.username}</span>
                    <button
                      onClick={() => accept(r.id)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Kabul et
                    </button>
                    <button
                      onClick={() => decline(r.id)}
                      disabled={busy}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-red-500 disabled:opacity-50"
                    >
                      Reddet
                    </button>
                  </div>
                ))}
              </section>
              <section>
                <h3 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-widest text-sub/70">
                  Giden istekler
                </h3>
                {requests.outgoing.length === 0 && (
                  <p className="px-1 py-2 text-sm text-sub/70">Bekleyen giden istek yok.</p>
                )}
                {requests.outgoing.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2/60"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {r.user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.user.username}</span>
                    <span className="text-[11px] text-sub/70">Bekliyor</span>
                    <button
                      onClick={() => decline(r.id)}
                      disabled={busy}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-red-500 disabled:opacity-50"
                    >
                      İptal
                    </button>
                  </div>
                ))}
              </section>
            </div>
          )}

          {tab === 'add' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
                <input
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  placeholder="Kullanıcı adıyla ara…"
                  autoFocus
                  className="w-full rounded-lg border border-edge bg-surface2 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-sub/50 focus:border-accent"
                />
              </div>
              <p className="px-1 text-[11px] text-sub/70">En az 2 karakter yazın.</p>

              {searching && (
                <div className="flex items-center justify-center gap-2 py-4 text-sub">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aranıyor…
                </div>
              )}

              {!searching &&
                results.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2/60"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{u.username}</span>
                    {u.friendship === 'none' && (
                      <button
                        onClick={() => sendRequest(u.id)}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Ekle
                      </button>
                    )}
                    {u.friendship === 'pending_outgoing' && (
                      <span className="text-[11px] text-sub/70">İstek gönderildi</span>
                    )}
                    {u.friendship === 'pending_incoming' && (
                      <button
                        onClick={() => sendRequest(u.id)}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Kabul et
                      </button>
                    )}
                    {u.friendship === 'friends' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        Arkadaş
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Arkadaşlığı sonlandır?"
        message={`"${removeTarget?.username ?? ''}" ile arkadaşlığınız sonlandırılacak.`}
        onConfirm={() => removeTarget && remove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}