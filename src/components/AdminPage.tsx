import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { AdminLimits, AdminLog, AdminNote, AdminPublicShare, AdminShareView, AdminUser, AdminUserDetail } from '../types'
import { cn, excerpt, timeAgo } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  ShieldPlus,
  ShieldX,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

type Tab = 'users' | 'notes' | 'logs' | 'limits'

type ConfirmAction =
  | { type: 'ban'; user: AdminUser }
  | { type: 'unban'; user: AdminUser }
  | { type: 'role'; user: AdminUser; makeAdmin: boolean }
  | { type: 'deleteNote'; note: { id: string; title: string }; userId?: string }
  | null

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone?: 'default' | 'red' | 'amber'
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-edge bg-surface p-4">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          tone === 'red'
            ? 'bg-red-500/10 text-red-500'
            : tone === 'amber'
              ? 'bg-amber-500/10 text-amber-600'
              : 'bg-accent/10 text-accent',
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-semibold tabular-nums text-ink">{value}</div>
        <div className="truncate text-[11px] font-medium text-sub">{label}</div>
      </div>
    </div>
  )
}

function StatusBadge({ banned, isAdmin }: { banned: boolean; isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-500/30">
        <ShieldCheck className="h-3 w-3" />
        Yönetici
      </span>
    )
  }
  if (banned) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-500 ring-1 ring-red-500/30">
        <ShieldOff className="h-3 w-3" />
        Engelli
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-500/30">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Aktif
    </span>
  )
}

function ShareChips({
  publicShared,
  sharedWith,
}: {
  publicShared: boolean
  sharedWith: { username: string; permission: 'view' | 'edit' }[]
}) {
  if (!publicShared && sharedWith.length === 0) return <span className="text-xs text-sub/60">—</span>
  const shown = sharedWith.slice(0, 3)
  const rest = sharedWith.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {publicShared && (
        <span
          className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-500/30"
          title="Herkese açık bağlantı ile paylaşılmış"
        >
          <Globe className="h-2.5 w-2.5" />
          Herkese açık
        </span>
      )}
      {shown.map((s) => (
        <span
          key={s.username + s.permission}
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1',
            s.permission === 'edit'
              ? 'bg-accent/10 text-accent ring-accent/30'
              : 'bg-surface2 text-sub ring-edge',
          )}
          title={`${s.username} · ${s.permission === 'edit' ? 'Düzenleyebilir' : 'Yalnızca görüntüleyebilir'}`}
        >
          <Link2 className="h-2.5 w-2.5" />
          @{s.username}
        </span>
      ))}
      {rest > 0 && <span className="text-[10px] text-sub/70">+{rest}</span>}
    </div>
  )
}

export function AdminPage({ onClose, meId }: { onClose: () => void; meId: string }) {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [notesQuery, setNotesQuery] = useState('')
  const [usersQuery, setUsersQuery] = useState('')
  const [logsQuery, setLogsQuery] = useState('')
  const [logsSuccess, setLogsSuccess] = useState<'all' | 'true' | 'false'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmAction>(null)
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)
  const [limits, setLimits] = useState<AdminLimits | null>(null)

  const loadSettings = useCallback(async () => {
    setError(null)
    try {
      setLimits(await api.adminSettings())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setError(null)
    try {
      setUsers(await api.adminUsers())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const saveUserLimits = useCallback(
    async (id: string, patch: { maxNotes?: number | null; maxNoteChars?: number | null }) => {
      const r = await api.adminSetUserLimits(id, patch)
      setDetail((d) => (d ? { ...d, user: { ...d.user, maxNotes: r.maxNotes, maxNoteChars: r.maxNoteChars } } : d))
      await loadUsers()
    },
    [loadUsers],
  )

  const loadNotes = useCallback(async (q: string) => {
    setError(null)
    try {
      setNotes(await api.adminNotes(q))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const loadLogs = useCallback(async (q: string, success: 'all' | 'true' | 'false') => {
    setError(null)
    try {
      setLogs(
        await api.adminLogs({
          q: q.trim(),
          success: success === 'all' ? null : success === 'true',
        }),
      )
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    setTab('users')
    setDetailId(null)
    setDetail(null)
    setNotesQuery('')
    setUsersQuery('')
    setLogsQuery('')
    setLogsSuccess('all')
    setError(null)
    loadUsers()
    loadNotes('')
    loadLogs('', 'all')
    loadSettings()
  }, [loadUsers, loadNotes, loadLogs, loadSettings])

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetail(null)
    setError(null)
    try {
      setDetail(await api.adminUserDetail(id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    const c = confirm
    setConfirm(null)
    setBusy(true)
    setError(null)
    try {
      if (c.type === 'ban') await api.adminBan(c.user.id)
      else if (c.type === 'unban') await api.adminUnban(c.user.id)
      else if (c.type === 'role') await api.adminSetRole(c.user.id, c.makeAdmin)
      else if (c.type === 'deleteNote') {
        if (c.userId) await api.adminDeleteUserNote(c.userId, c.note.id)
        else await api.adminDeleteNote(c.note.id)
      }
      await loadUsers()
      await loadNotes(notesQuery)
      await loadLogs(logsQuery, logsSuccess)
      if (detailId) openDetail(detailId)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = usersQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, usersQuery])

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      totalNotes: notes.length,
      banned: users.filter((u) => u.bannedAt).length,
      admins: users.filter((u) => u.isAdmin).length,
    }),
    [users, notes],
  )

  const inputCls =
    'w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-sub/50 focus:border-accent focus:ring-2 focus:ring-accent/20'

  return (
    <div className="min-h-dvh bg-base text-ink">
      <header className="sticky top-0 z-20 border-b border-edge bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            onClick={onClose}
            className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Geri"
            title="Geri"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-ink">Yönetim Paneli</h1>
            <p className="hidden truncate text-[11px] text-sub sm:block">
              Kullanıcıları ve notları yönetin
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-2.5 py-1 text-[11px] font-medium text-sub">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Yönetici
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        {!detailId && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Toplam Not" value={stats.totalNotes} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Engelli Kullanıcı" value={stats.banned} icon={<ShieldOff className="h-5 w-5" />} tone="red" />
            <StatCard label="Yönetici" value={stats.admins} icon={<ShieldCheck className="h-5 w-5" />} tone="amber" />
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>
        )}

        {!detailId && (
          <div className="mt-5 flex gap-1 overflow-x-auto border-b border-edge">
            {(
              [
                ['users', 'Kullanıcılar'],
                ['notes', 'Notlar'],
                ['logs', 'Günlükler'],
                ['limits', 'Limitler'],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'relative -mb-px shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === key ? 'text-ink' : 'text-sub hover:text-ink',
                )}
              >
                {label}
                <span
                  className={cn(
                    'absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent transition-opacity',
                    tab === key ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            ))}
          </div>
        )}

        <div className="py-5">
          {detailId ? (
            detail === null ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sub">
                <Loader2 className="h-5 w-5 animate-spin" />
                Yükleniyor…
              </div>
            ) : (
              <UserDetailView
                detail={detail}
                busy={busy}
                meId={meId}
                onBack={() => {
                  setDetailId(null)
                  setDetail(null)
                }}
                onBan={() => setConfirm({ type: 'ban', user: detail.user })}
                onUnban={() => setConfirm({ type: 'unban', user: detail.user })}
                onRole={(makeAdmin) => setConfirm({ type: 'role', user: detail.user, makeAdmin })}
                onDeleteNote={(n) => setConfirm({ type: 'deleteNote', note: n, userId: detail.user.id })}
                onResetPassword={() => setResetUser(detail.user)}
                globalLimits={limits}
                onSaveLimits={(patch) => saveUserLimits(detail.user.id, patch)}
                inputCls={inputCls}
              />
            )
          ) : tab === 'users' ? (
            <UsersTab
              users={filteredUsers}
              query={usersQuery}
              onQueryChange={setUsersQuery}
              busy={busy}
              meId={meId}
              limits={limits}
              onOpenDetail={openDetail}
              onResetPassword={setResetUser}
              onBan={(u) => setConfirm({ type: 'ban', user: u })}
              onUnban={(u) => setConfirm({ type: 'unban', user: u })}
              onRole={(u, makeAdmin) => setConfirm({ type: 'role', user: u, makeAdmin })}
              inputCls={inputCls}
            />
          ) : tab === 'notes' ? (
            <NotesTab
              notes={notes}
              query={notesQuery}
              onQueryChange={(q) => {
                setNotesQuery(q)
                loadNotes(q.trim())
              }}
              busy={busy}
              onDelete={(n) => setConfirm({ type: 'deleteNote', note: n })}
              inputCls={inputCls}
            />
          ) : tab === 'logs' ? (
            <LogsTab
              logs={logs}
              query={logsQuery}
              success={logsSuccess}
              onQueryChange={(q) => {
                setLogsQuery(q)
                loadLogs(q, logsSuccess)
              }}
              onSuccessChange={(s) => {
                setLogsSuccess(s)
                loadLogs(logsQuery, s)
              }}
              onRefresh={() => loadLogs(logsQuery, logsSuccess)}
              busy={busy}
              inputCls={inputCls}
            />
          ) : (
            <LimitsTab
              limits={limits}
              inputCls={inputCls}
              onSaved={() => {
                loadUsers()
                loadLogs(logsQuery, logsSuccess)
              }}
            />
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.type === 'ban'
            ? 'Kullanıcıyı engelle?'
            : confirm?.type === 'unban'
              ? 'Yasağı kaldır?'
              : confirm?.type === 'role'
                ? confirm.makeAdmin
                  ? 'Yönetici yap?'
                  : 'Yöneticiliği kaldır?'
                : 'Notu sil?'
        }
        message={
          confirm?.type === 'ban'
            ? `"${confirm.user.username}" artık giriş yapamayacak ve tüm erişimi kapatılacak.`
            : confirm?.type === 'unban'
              ? `"${confirm.user.username}" için engeli kaldıracaksınız.`
              : confirm?.type === 'role'
                ? confirm.makeAdmin
                  ? `"${confirm.user.username}" yönetici yetkisine sahip olacak ve tüm kullanıcıları, notları ve günlükleri görebilecek.`
                  : `"${confirm.user.username}" yönetici yetkisini kaybedecek.`
                : `"${confirm?.note.title || 'Başlıksız'}" notu kalıcı olarak silinecek.`
        }
        confirmLabel={
          confirm?.type === 'ban'
            ? 'Engelle'
            : confirm?.type === 'unban'
              ? 'Kaldır'
              : confirm?.type === 'role'
                ? confirm.makeAdmin
                  ? 'Yönetici Yap'
                  : 'Yetkiyi Kaldır'
                : 'Sil'
        }
        cancelLabel="Vazgeç"
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />

      <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} onDone={() => {
        setResetUser(null)
        loadUsers()
        if (detailId) openDetail(detailId)
      }} />
    </div>
  )
}

function UsersTab({
  users,
  query,
  onQueryChange,
  busy,
  meId,
  limits,
  onOpenDetail,
  onResetPassword,
  onBan,
  onUnban,
  onRole,
  inputCls,
}: {
  users: AdminUser[]
  query: string
  onQueryChange: (q: string) => void
  busy: boolean
  meId: string
  limits: AdminLimits | null
  onOpenDetail: (id: string) => void
  onResetPassword: (u: AdminUser) => void
  onBan: (u: AdminUser) => void
  onUnban: (u: AdminUser) => void
  onRole: (u: AdminUser, makeAdmin: boolean) => void
  inputCls: string
}) {
  const effNoteLimit = (u: AdminUser): number | null => u.maxNotes ?? limits?.maxNotesPerUser ?? null
  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Kullanıcı adı veya e-posta ara…"
          className={inputCls + ' pl-9'}
        />
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge py-16 text-center text-sm text-sub/70">
          Kullanıcı bulunamadı.
        </div>
      ) : (
        <>
          {/* Masaüstü tablo */}
          <div className="hidden overflow-hidden rounded-xl border border-edge bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-[11px] font-semibold uppercase tracking-wider text-sub">
                  <th className="px-4 py-3 font-medium">Kullanıcı</th>
                  <th className="px-4 py-3 font-medium">E-posta</th>
                  <th className="px-4 py-3 text-center font-medium">Notlar</th>
                  <th className="px-4 py-3 text-center font-medium">Arkadaş</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Katılım</th>
                  <th className="px-4 py-3 text-right font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-surface2/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-ink">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sub">{u.email}</td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {(() => {
                        const eff = effNoteLimit(u)
                        const over = eff !== null && u.noteCount > eff
                        return (
                          <span
                            className={cn('inline-flex items-center gap-1', over ? 'font-semibold text-red-500' : 'text-ink')}
                            title={
                              over
                                ? `Not limiti aşıldı (limit: ${eff?.toLocaleString('tr-TR')})`
                                : eff !== null
                                  ? `Limit: ${eff.toLocaleString('tr-TR')}`
                                  : undefined
                            }
                          >
                            {u.noteCount}
                            {over && <AlertTriangle className="h-3.5 w-3.5" />}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-ink">{u.friendCount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge banned={!!u.bannedAt} isAdmin={u.isAdmin} />
                    </td>
                    <td className="px-4 py-3 text-xs text-sub">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenDetail(u.id)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink"
                        >
                          Detay
                        </button>
                        {!u.isAdmin && (
                          <button
                            onClick={() => onResetPassword(u)}
                            disabled={busy}
                            title="Şifre sıfırla"
                            className="rounded-lg p-1.5 text-sub transition-colors hover:bg-surface2 hover:text-accent disabled:opacity-50"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        )}
                        {u.isAdmin && u.id !== meId && (
                          <button
                            onClick={() => onRole(u, false)}
                            disabled={busy}
                            title="Yöneticiliği kaldır"
                            className="rounded-lg p-1.5 text-sub transition-colors hover:bg-amber-500/10 hover:text-amber-600 disabled:opacity-50"
                          >
                            <ShieldX className="h-4 w-4" />
                          </button>
                        )}
                        {!u.isAdmin && (
                          <button
                            onClick={() => onRole(u, true)}
                            disabled={busy}
                            title="Yönetici yap"
                            className="rounded-lg p-1.5 text-sub transition-colors hover:bg-surface2 hover:text-accent disabled:opacity-50"
                          >
                            <ShieldPlus className="h-4 w-4" />
                          </button>
                        )}
                        {!u.isAdmin &&
                          (u.bannedAt ? (
                            <button
                              onClick={() => onUnban(u)}
                              disabled={busy}
                              title="Yasağı kaldır"
                              className="rounded-lg p-1.5 text-sub transition-colors hover:bg-surface2 hover:text-emerald-600 disabled:opacity-50"
                            >
                              <ShieldOff className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onBan(u)}
                              disabled={busy}
                              title="Engelle"
                              className="rounded-lg p-1.5 text-sub transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil kart listesi */}
          <div className="space-y-2 md:hidden">
            {users.map((u) => (
              <div key={u.id} className="rounded-xl border border-edge bg-surface p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink">{u.username}</span>
                      <StatusBadge banned={!!u.bannedAt} isAdmin={u.isAdmin} />
                    </div>
                    <p className="truncate text-[11px] text-sub">{u.email}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-sub">
                  {(() => {
                    const eff = effNoteLimit(u)
                    const over = eff !== null && u.noteCount > eff
                    return (
                      <>
                        <span className={cn(over && 'font-semibold text-red-500')}>
                          {u.noteCount} not
                        </span>
                        {over && ` (limit ${eff?.toLocaleString('tr-TR')})`}
                        <span> · {u.friendCount} arkadaş · </span>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : ''}
                      </>
                    )
                  })()}
                </p>
                <div className="mt-2 flex items-center gap-1.5 border-t border-edge pt-2">
                  <button
                    onClick={() => onOpenDetail(u.id)}
                    className="rounded-lg bg-surface2 px-2.5 py-1.5 text-xs font-medium text-ink ring-1 ring-edge transition-colors hover:bg-surface"
                  >
                    Detay
                  </button>
                  {!u.isAdmin && (
                    <button
                      onClick={() => onResetPassword(u)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg bg-surface2 px-2.5 py-1.5 text-xs font-medium text-sub ring-1 ring-edge transition-colors hover:text-accent disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Şifre
                    </button>
                  )}
                  {u.isAdmin && u.id !== meId ? (
                    <button
                      onClick={() => onRole(u, false)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg bg-surface2 px-2.5 py-1.5 text-xs font-medium text-sub ring-1 ring-edge transition-colors hover:text-amber-600 disabled:opacity-50"
                    >
                      <ShieldX className="h-3.5 w-3.5" />
                      Yetki kaldır
                    </button>
                  ) : (
                    !u.isAdmin && (
                      <button
                        onClick={() => onRole(u, true)}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-lg bg-surface2 px-2.5 py-1.5 text-xs font-medium text-sub ring-1 ring-edge transition-colors hover:text-accent disabled:opacity-50"
                      >
                        <ShieldPlus className="h-3.5 w-3.5" />
                        Yönetici yap
                      </button>
                    )
                  )}
                  <div className="ml-auto">
                    {!u.isAdmin &&
                      (u.bannedAt ? (
                        <button
                          onClick={() => onUnban(u)}
                          disabled={busy}
                          className="rounded-lg bg-surface2 px-2.5 py-1.5 text-xs font-medium text-sub ring-1 ring-edge transition-colors hover:text-emerald-600 disabled:opacity-50"
                        >
                          Yasağı kaldır
                        </button>
                      ) : (
                        <button
                          onClick={() => onBan(u)}
                          disabled={busy}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Engelle
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NotesTab({
  notes,
  query,
  onQueryChange,
  busy,
  onDelete,
  inputCls,
}: {
  notes: AdminNote[]
  query: string
  onQueryChange: (q: string) => void
  busy: boolean
  onDelete: (n: AdminNote) => void
  inputCls: string
}) {
  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Başlık veya içerikte ara…"
          className={inputCls + ' pl-9'}
        />
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge py-16 text-center text-sm text-sub/70">
          Not bulunamadı.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-edge bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-[11px] font-semibold uppercase tracking-wider text-sub">
                  <th className="px-4 py-3 font-medium">Başlık</th>
                  <th className="px-4 py-3 font-medium">Sahip</th>
                  <th className="px-4 py-3 font-medium">Paylaşım</th>
                  <th className="px-4 py-3 text-right font-medium">Görüntülenme</th>
                  <th className="px-4 py-3 font-medium">Güncellenme</th>
                  <th className="px-4 py-3 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {notes.map((n) => (
                  <tr key={n.id} className="transition-colors hover:bg-surface2/40">
                    <td className="max-w-md px-4 py-3">
                      <p className="truncate font-medium text-ink">{n.title || 'Başlıksız'}</p>
                      {n.content && <p className="truncate text-xs text-sub">{excerpt(n.content, 90)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-sub">
                        {n.username}
                        {n.userBanned && (
                          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-500 ring-1 ring-red-500/30">
                            Engelli
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ShareChips publicShared={n.publicShared} sharedWith={n.sharedWith} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {n.publicShared ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs tabular-nums text-sub"
                          title="Genel bağlantı görüntülenme sayısı"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {n.viewCount.toLocaleString('tr-TR')}
                        </span>
                      ) : (
                        <span className="text-xs text-sub/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-sub">{timeAgo(n.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(n)}
                        disabled={busy}
                        title="Notu sil"
                        className="rounded-lg p-1.5 text-sub transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-edge bg-surface p-3">
                <p className="font-medium text-ink">{n.title || 'Başlıksız'}</p>
                {n.content && <p className="mt-0.5 truncate text-xs text-sub">{excerpt(n.content, 90)}</p>}
                <div className="mt-1.5">
                  <ShareChips publicShared={n.publicShared} sharedWith={n.sharedWith} />
                </div>
                <div className="mt-2 flex items-center gap-1.5 border-t border-edge pt-2 text-[11px] text-sub">
                  {n.publicShared && (
                    <span className="inline-flex items-center gap-1 tabular-nums" title="Genel bağlantı görüntülenme sayısı">
                      <Eye className="h-3 w-3" />
                      {n.viewCount.toLocaleString('tr-TR')} görüntülenme
                    </span>
                  )}
                  <span className="font-medium text-ink">{n.username}</span>
                  {n.userBanned && <span className="text-red-500">· Engelli</span>}
                  <span>· {timeAgo(n.updatedAt)}</span>
                  <button
                    onClick={() => onDelete(n)}
                    disabled={busy}
                    className="ml-auto flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LogsTab({
  logs,
  query,
  success,
  onQueryChange,
  onSuccessChange,
  onRefresh,
  busy,
  inputCls,
}: {
  logs: AdminLog[]
  query: string
  success: 'all' | 'true' | 'false'
  onQueryChange: (q: string) => void
  onSuccessChange: (s: 'all' | 'true' | 'false') => void
  onRefresh: () => void
  busy: boolean
  inputCls: string
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Kullanıcı, e-posta veya IP ara…"
            className={inputCls + ' pl-9'}
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-edge bg-surface">
          {(
            [
              ['all', 'Tümü'],
              ['true', 'Başarılı'],
              ['false', 'Başarısız'],
            ] as ['all' | 'true' | 'false', string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onSuccessChange(key)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors',
                success === key ? 'bg-accent text-white' : 'text-sub hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={onRefresh}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-2 text-xs font-medium text-sub transition-colors hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
          Yenile
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge py-16 text-center text-sm text-sub/70">
          Günlük bulunamadı.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-edge bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-[11px] font-semibold uppercase tracking-wider text-sub">
                  <th className="px-4 py-3 font-medium">Sonuç</th>
                  <th className="px-4 py-3 font-medium">Kullanıcı</th>
                  <th className="px-4 py-3 font-medium">Kimlik</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Zaman</th>
                  <th className="px-4 py-3 font-medium">Ajan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {logs.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-surface2/40">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                          l.success
                            ? 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/30'
                            : 'bg-red-500/15 text-red-500 ring-red-500/30',
                        )}
                      >
                        {l.success ? 'Başarılı' : 'Başarısız'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{l.username ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-sub">{l.identifier}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-sub">{l.ip ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-sub" title={l.createdAt ? new Date(l.createdAt).toLocaleString('tr-TR') : ''}>
                      {l.createdAt ? new Date(l.createdAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="max-w-[12rem] px-4 py-3">
                      <p className="truncate text-[11px] text-sub/70" title={l.userAgent ?? ''}>
                        {l.userAgent ?? '—'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {logs.map((l) => (
              <div key={l.id} className="rounded-xl border border-edge bg-surface p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                      l.success
                        ? 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/30'
                        : 'bg-red-500/15 text-red-500 ring-red-500/30',
                    )}
                  >
                    {l.success ? 'Başarılı' : 'Başarısız'}
                  </span>
                  <span className="text-xs text-sub/70">{l.createdAt ? new Date(l.createdAt).toLocaleString('tr-TR') : ''}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-ink">{l.username ?? l.identifier}</p>
                {l.username && l.username !== l.identifier && (
                  <p className="truncate text-[11px] text-sub">Kimlik: {l.identifier}</p>
                )}
                <p className="text-[11px] text-sub">IP: {l.ip ?? '—'}</p>
                {l.userAgent && <p className="truncate text-[10px] text-sub/70">{l.userAgent}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LimitsTab({
  limits,
  onSaved,
  inputCls,
}: {
  limits: AdminLimits | null
  onSaved: () => void
  inputCls: string
}) {
  const [notes, setNotes] = useState('')
  const [chars, setChars] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!limits) return
    setNotes(String(limits.maxNotesPerUser))
    setChars(String(limits.maxNoteContentLength))
    setSaved(false)
  }, [limits])

  const save = async () => {
    setError(null)
    setSaved(false)
    const n = Number(notes)
    const c = Number(chars)
    if (!Number.isInteger(n) || n < 1 || n > 100000) {
      setError('Not sayısı 1-100.000 arasında olmalıdır')
      return
    }
    if (!Number.isInteger(c) || c < 100 || c > 2000000) {
      setError('İçerik uzunluğu 100-2.000.000 arasında olmalıdır')
      return
    }
    setBusy(true)
    try {
      await api.adminUpdateSettings({ maxNotesPerUser: n, maxNoteContentLength: c })
      setSaved(true)
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-edge bg-surface p-4">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-sub">
          <Gauge className="h-3.5 w-3.5" />
          Genel (Varsayılan) Limitler
        </h3>
        <p className="mt-1.5 text-[11px] text-sub/80">
          Tüm kullanıcılar için geçerli varsayılan sınırlar. Kişisel sınırı olmayan kullanıcılar bu değerleri kullanır.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-sub">
              Maks. not sayısı (kullanıcı başına)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-sub">
              Maks. not içerik uzunluğu (karakter)
            </label>
            <input
              value={chars}
              onChange={(e) => setChars(e.target.value)}
              inputMode="numeric"
              className={inputCls}
            />
          </div>
        </div>
        {error && <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>}
        {saved && (
          <div className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
            Genel limitler güncellendi
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={save}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <Save className="h-3.5 w-3.5" />
            Kaydet
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-edge bg-surface p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sub">Nasıl çalışır?</h3>
        <ul className="mt-2 space-y-1 text-[11px] text-sub/80">
          <li>• Kullanıcı başına not sayısı ve not içerik uzunluğu sınırları kötüye kullanımı önler.</li>
          <li>• "Kullanıcılar" sekmesinden bir kullanıcının detayına girerek yalnızca o kullanıcıya özel sınır belirleyebilirsiniz.</li>
          <li>• Kişisel sınır belirlenmemişse genel (varsayılan) değer kullanılır.</li>
        </ul>
      </div>
    </div>
  )
}

function PublicSharesCard({ shares }: { shares: AdminPublicShare[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [views, setViews] = useState<AdminShareView[] | null>(null)
  const [busy, setBusy] = useState(false)

  const toggle = async (noteId: string) => {
    if (expanded === noteId) {
      setExpanded(null)
      setViews(null)
      return
    }
    setExpanded(noteId)
    setViews(null)
    setBusy(true)
    try {
      setViews(await api.adminNoteViews(noteId))
    } catch (err) {
      setViews(null)
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-edge bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-sub">
          <Globe className="h-3.5 w-3.5" />
          Genel Paylaşımlar ({shares.length})
        </h3>
        <span className="text-[11px] text-sub">Herkese açık bağlantısı olan notlar ve görüntülenme istatistikleri</span>
      </div>

      {shares.length === 0 ? (
        <p className="py-4 text-sm text-sub/70">Bu kullanıcının genel paylaşımlı notu yok.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {shares.map((s) => (
            <div key={s.noteId} className="rounded-lg border border-edge/60 bg-surface2/40">
              <button
                onClick={() => toggle(s.noteId)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface2"
              >
                <span className={cn('text-sub transition-transform', expanded === s.noteId && 'rotate-90')}>
                  {expanded === s.noteId ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{s.title || 'Başlıksız'}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-sub">
                  <Eye className="h-3.5 w-3.5" />
                  {s.viewCount.toLocaleString('tr-TR')}
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-xs tabular-nums text-sub sm:flex">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {s.uniqueIpCount.toLocaleString('tr-TR')} IP
                </span>
                <span className="hidden shrink-0 text-[11px] text-sub md:block">
                  {s.lastViewAt ? `Son: ${timeAgo(s.lastViewAt)}` : 'Hiç görüntülenmedi'}
                </span>
              </button>

              {expanded === s.noteId && (
                <div className="border-t border-edge/60 px-4 py-3">
                  <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-sub">
                    <span>
                      Görüntülenme: <span className="font-semibold text-ink">{s.viewCount.toLocaleString('tr-TR')}</span>
                    </span>
                    <span>
                      Farklı IP: <span className="font-semibold text-ink">{s.uniqueIpCount.toLocaleString('tr-TR')}</span>
                    </span>
                    <span>
                      İlk: <span className="font-medium text-ink">{s.firstViewAt ? timeAgo(s.firstViewAt) : '—'}</span>
                    </span>
                    <span>
                      Son: <span className="font-medium text-ink">{s.lastViewAt ? timeAgo(s.lastViewAt) : '—'}</span>
                    </span>
                  </div>

                  {busy ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-sub">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Yükleniyor…
                    </div>
                  ) : views === null ? (
                    <p className="py-1 text-xs text-red-500">Son görüntülemeler yüklenemedi.</p>
                  ) : views.length === 0 ? (
                    <p className="py-1 text-xs text-sub/70">Görüntülenme kaydı yok.</p>
                  ) : (
                    <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                      {views.map((v) => (
                        <div key={v.id} className="flex items-start gap-2 rounded-md px-1 py-1 text-[11px]">
                          <span className="w-32 shrink-0 tabular-nums text-sub">
                            {new Date(v.viewedAt).toLocaleString('tr-TR')}
                          </span>
                          <span className="w-28 shrink-0 tabular-nums text-sub">{v.ip ?? '—'}</span>
                          <span className="min-w-0 flex-1 truncate text-sub/70" title={v.userAgent ?? ''}>
                            {v.userAgent || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function UserDetailView({
  detail,
  busy,
  meId,
  globalLimits,
  onSaveLimits,
  onBack,
  onBan,
  onUnban,
  onRole,
  onDeleteNote,
  onResetPassword,
  inputCls,
}: {
  detail: AdminUserDetail
  busy: boolean
  meId: string
  globalLimits: AdminLimits | null
  onSaveLimits: (patch: { maxNotes?: number | null; maxNoteChars?: number | null }) => Promise<void>
  onBack: () => void
  onBan: () => void
  onUnban: () => void
  onRole: (makeAdmin: boolean) => void
  onDeleteNote: (n: AdminUserDetail['notes'][number]) => void
  onResetPassword: () => void
  inputCls: string
}) {
  const { user, notes, friends } = detail

  const [limitNotes, setLimitNotes] = useState(user.maxNotes === null ? '' : String(user.maxNotes))
  const [limitChars, setLimitChars] = useState(user.maxNoteChars === null ? '' : String(user.maxNoteChars))
  const [limitBusy, setLimitBusy] = useState(false)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [limitSaved, setLimitSaved] = useState(false)

  useEffect(() => {
    setLimitNotes(user.maxNotes === null ? '' : String(user.maxNotes))
    setLimitChars(user.maxNoteChars === null ? '' : String(user.maxNoteChars))
    setLimitError(null)
    setLimitSaved(false)
  }, [user.id, user.maxNotes, user.maxNoteChars])

  const effNotes = user.maxNotes ?? globalLimits?.maxNotesPerUser ?? null
  const effChars = user.maxNoteChars ?? globalLimits?.maxNoteContentLength ?? null

  const saveLimits = async () => {
    setLimitError(null)
    setLimitSaved(false)
    const patch: { maxNotes?: number | null; maxNoteChars?: number | null } = {}
    if (limitNotes.trim() === '') {
      patch.maxNotes = null
    } else {
      const n = Number(limitNotes)
      if (!Number.isInteger(n) || n < 1 || n > 100000) {
        setLimitError('Not sayısı 1-100.000 arasında olmalıdır')
        return
      }
      patch.maxNotes = n
    }
    if (limitChars.trim() === '') {
      patch.maxNoteChars = null
    } else {
      const c = Number(limitChars)
      if (!Number.isInteger(c) || c < 100 || c > 2000000) {
        setLimitError('İçerik uzunluğu 100-2.000.000 arasında olmalıdır')
        return
      }
      patch.maxNoteChars = c
    }
    setLimitBusy(true)
    try {
      await onSaveLimits(patch)
      setLimitSaved(true)
    } catch (err) {
      setLimitError((err as Error).message)
    } finally {
      setLimitBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Kullanıcılara dön
      </button>

      <div className="rounded-xl border border-edge bg-surface p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{user.username}</h2>
              <StatusBadge banned={!!user.bannedAt} isAdmin={user.isAdmin} />
            </div>
            <p className="mt-0.5 text-xs text-sub">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user.id !== meId && (
              <button
                onClick={() => onRole(!user.isAdmin)}
                disabled={busy}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ring-1 ring-edge transition-colors disabled:opacity-50',
                  user.isAdmin
                    ? 'bg-surface2 text-ink hover:text-amber-600'
                    : 'bg-surface2 text-ink hover:text-accent',
                )}
              >
                {user.isAdmin ? (
                  <>
                    <ShieldX className="h-3.5 w-3.5" />
                    Yöneticiliği kaldır
                  </>
                ) : (
                  <>
                    <ShieldPlus className="h-3.5 w-3.5" />
                    Yönetici yap
                  </>
                )}
              </button>
            )}
            {!user.isAdmin && (
              <>
                <button
                  onClick={onResetPassword}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-surface2 px-3 py-2 text-xs font-medium text-ink ring-1 ring-edge transition-colors hover:text-accent disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Şifre sıfırla
                </button>
                {user.bannedAt ? (
                  <button
                    onClick={onUnban}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-surface2 px-3 py-2 text-xs font-medium text-ink ring-1 ring-edge transition-colors hover:text-emerald-600 disabled:opacity-50"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    Yasağı kaldır
                  </button>
                ) : (
                  <button
                    onClick={onBan}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Engelle
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-edge pt-4">
          <div>
            <div className="text-lg font-semibold tabular-nums text-ink">{notes.length}</div>
            <div className="text-[11px] text-sub">Not</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-ink">{friends.length}</div>
            <div className="text-[11px] text-sub">Arkadaş</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-ink">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '—'}
            </div>
            <div className="text-[11px] text-sub">Katılım</div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-edge bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-sub">
            <Gauge className="h-3.5 w-3.5" />
            Not Limitleri
          </h3>
          <span className="text-[11px] text-sub">
            Efektif:{' '}
            <span className="font-medium text-ink">{effNotes !== null ? effNotes.toLocaleString('tr-TR') : '—'}</span> not ·{' '}
            <span className="font-medium text-ink">{effChars !== null ? effChars.toLocaleString('tr-TR') : '—'}</span> karakter
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-sub/80">
          Boş bırakılan alan genel varsayılanı kullanır. Kullanım:{' '}
          <span className={cn('font-medium', notes.length > (effNotes ?? Infinity) ? 'text-red-500' : 'text-ink')}>
            {notes.length.toLocaleString('tr-TR')} / {effNotes !== null ? effNotes.toLocaleString('tr-TR') : '—'}
          </span>{' '}
          not
          {notes.length > (effNotes ?? Infinity) && ' — limit aşıldı!'}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-sub">
              Maks. not sayısı (kişisel)
            </label>
            <input
              value={limitNotes}
              onChange={(e) => setLimitNotes(e.target.value)}
              inputMode="numeric"
              placeholder={globalLimits ? `Varsayılan: ${globalLimits.maxNotesPerUser.toLocaleString('tr-TR')}` : 'Varsayılan'}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-sub">
              Maks. içerik uzunluğu (karakter)
            </label>
            <input
              value={limitChars}
              onChange={(e) => setLimitChars(e.target.value)}
              inputMode="numeric"
              placeholder={globalLimits ? `Varsayılan: ${globalLimits.maxNoteContentLength.toLocaleString('tr-TR')}` : 'Varsayılan'}
              className={inputCls}
            />
          </div>
        </div>
        {limitError && (
          <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{limitError}</div>
        )}
        {limitSaved && (
          <div className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
            Limitler kaydedildi
          </div>
        )}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => {
              setLimitNotes('')
              setLimitChars('')
            }}
            className="rounded-lg bg-surface2 px-3 py-2 text-xs font-medium text-sub ring-1 ring-edge transition-colors hover:text-ink"
          >
            Varsayılana dön
          </button>
          <button
            onClick={saveLimits}
            disabled={limitBusy}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {limitBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <Save className="h-3.5 w-3.5" />
            Kaydet
          </button>
        </div>
      </section>

      <PublicSharesCard shares={detail.publicShares} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-edge bg-surface p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-sub">
            Notlar ({notes.length})
          </h3>
          {notes.length === 0 && <p className="py-4 text-sm text-sub/70">Bu kullanıcının notu yok.</p>}
          <div className="space-y-1.5">
            {notes.map((n) => (
              <div key={n.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{n.title || 'Başlıksız'}</p>
                  {n.content && <p className="truncate text-[11px] text-sub">{excerpt(n.content)}</p>}
                  <div className="mt-1">
                    <ShareChips publicShared={n.publicShared} sharedWith={n.sharedWith} />
                  </div>
                  <p className="text-[10px] text-sub/70">
                    {timeAgo(n.updatedAt)}
                    {n.isPinned ? ' · Sabit' : ''}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteNote(n)}
                  disabled={busy}
                  title="Notu sil"
                  className="shrink-0 rounded-lg p-2 text-sub opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 max-md:opacity-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-edge bg-surface p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-sub">
            Arkadaşlar ({friends.length})
          </h3>
          {friends.length === 0 && <p className="py-4 text-sm text-sub/70">Bu kullanıcının arkadaşı yok.</p>}
          <div className="space-y-1.5">
            {friends.map((f) => (
              <div key={f.userId} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface2/60">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {f.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.username}</span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-sub">
                  <UserPlus className="h-3 w-3" />
                  {new Date(f.since).toLocaleDateString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(12)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser | null
  onClose: () => void
  onDone: () => void
}) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setValue('')
    setShow(false)
    setError(null)
    setNotice(null)
  }, [user])

  const submit = async () => {
    if (!user) return
    setError(null)
    setNotice(null)
    if (value.length < 8) {
      setError('Parola en az 8 karakter olmalıdır')
      return
    }
    setBusy(true)
    try {
      await api.adminResetPassword(user.id, value)
      setNotice(`"${user.username}" parolası sıfırlandı`)
      window.setTimeout(onDone, 900)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Şifre sıfırla">
      <div className="dialog-backdrop-enter absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="dialog-enter relative w-full max-w-sm rounded-2xl border border-edge bg-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Şifre Sıfırla</h2>
              <p className="text-xs text-sub">Yeni bir parola belirleyin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {notice && (
          <div className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">{notice}</div>
        )}
        {error && <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-sub">
              Kullanıcı · <span className="text-ink">{user.username}</span>
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-edge bg-surface2 px-3 py-2.5 pr-24 text-sm text-ink outline-none transition-colors placeholder:text-sub/50 focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="Yeni parola (en az 8 karakter)"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setValue(randomPassword())}
                  className="rounded p-1.5 text-sub hover:text-accent"
                  aria-label="Rastgele parola üret"
                  title="Rastgele parola"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="rounded p-1.5 text-sub hover:text-ink"
                  aria-label={show ? 'Parolayı gizle' : 'Parolayı göster'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="min-h-10 rounded-lg px-3.5 py-2 text-sm font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink"
            >
              Vazgeç
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Parolayı Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}