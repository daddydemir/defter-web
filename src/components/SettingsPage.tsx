import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { AuthUser } from '../lib/auth'
import type { AuthLog } from '../types'
import { cn, timeAgo } from '../lib/format'
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Moon,
  Palette,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react'

type Section = 'profil' | 'gorunum' | 'parola' | 'guvenlik'

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'profil', label: 'Profil', icon: <UserRound className="h-4 w-4" /> },
  { key: 'gorunum', label: 'Görünüm', icon: <Palette className="h-4 w-4" /> },
  { key: 'parola', label: 'Parola', icon: <KeyRound className="h-4 w-4" /> },
  { key: 'guvenlik', label: 'Güvenlik', icon: <Shield className="h-4 w-4" /> },
]

const inputCls =
  'w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-sub/50 focus:border-accent focus:ring-2 focus:ring-accent/20'

export function SettingsPage({
  user,
  theme,
  onToggleTheme,
  onClose,
}: {
  user: AuthUser
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onClose: () => void
}) {
  const [section, setSection] = useState<Section>('profil')

  return (
    <div className="min-h-dvh bg-base text-ink">
      <header className="sticky top-0 z-20 border-b border-edge bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            onClick={onClose}
            className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Geri"
            title="Geri"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-ink">Ayarlar</h1>
            <p className="hidden truncate text-[11px] text-sub sm:block">
              Hesap ve uygulama tercihleriniz
            </p>
          </div>
          {user.isAdmin && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-2.5 py-1 text-[11px] font-medium text-sub">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Yönetici
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6 md:flex-row">
        <nav className="shrink-0 md:w-52">
          {/* Mobil: yatay sekmeler */}
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:hidden">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  section === s.key
                    ? 'bg-surface2 text-ink ring-1 ring-edge'
                    : 'text-sub hover:text-ink',
                )}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* Masaüstü: dikey menü */}
          <div className="hidden flex-col gap-1 md:flex">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  section === s.key
                    ? 'bg-surface2 font-medium text-ink ring-1 ring-edge'
                    : 'text-sub hover:bg-surface2/60 hover:text-ink',
                )}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {section === 'profil' && <ProfileSection user={user} />}
          {section === 'gorunum' && <AppearanceSection theme={theme} onToggleTheme={onToggleTheme} />}
          {section === 'parola' && <PasswordSection />}
          {section === 'guvenlik' && <SecuritySection />}
        </div>
      </div>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-sub">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ProfileSection({ user }: { user: AuthUser }) {
  return (
    <div className="space-y-4">
      <Card title="Profil" subtitle="Hesap bilgileriniz">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xl font-semibold text-accent">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-ink">{user.username}</p>
              {user.isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-500/30">
                  <ShieldCheck className="h-3 w-3" />
                  Yönetici
                </span>
              )}
            </div>
            <p className="truncate text-sm text-sub">{user.email}</p>
          </div>
        </div>

        <dl className="mt-5 divide-y divide-edge border-t border-edge">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-xs font-medium text-sub">Kullanıcı adı</dt>
            <dd className="truncate text-sm font-medium text-ink">{user.username}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-xs font-medium text-sub">E-posta</dt>
            <dd className="truncate text-sm text-ink">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-xs font-medium text-sub">Rol</dt>
            <dd className="text-sm font-medium text-ink">{user.isAdmin ? 'Yönetici' : 'Üye'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}

function AppearanceSection({
  theme,
  onToggleTheme,
}: {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}) {
  return (
    <div className="space-y-4">
      <Card title="Görünüm" subtitle="Arayüz temasını seçin">
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard
            label="Koyu"
            icon={<Moon className="h-4 w-4" />}
            active={theme === 'dark'}
            onClick={() => theme !== 'dark' && onToggleTheme()}
            colors={['#0c0c10', '#131318', '#1b1b21', '#6366f1']}
          />
          <ThemeCard
            label="Açık"
            icon={<Sun className="h-4 w-4" />}
            active={theme === 'light'}
            onClick={() => theme !== 'light' && onToggleTheme()}
            colors={['#f7f7f8', '#ffffff', '#f1f1f3', '#4f46e5']}
          />
        </div>
      </Card>
    </div>
  )
}

function ThemeCard({
  label,
  icon,
  active,
  onClick,
  colors,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  colors: [string, string, string, string]
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border p-3 text-left transition-all',
        active
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-edge hover:border-accent/50',
      )}
    >
      <div className="pointer-events-none h-20 overflow-hidden rounded-lg border border-edge/60" style={{ background: colors[0] }}>
        <div className="flex h-full flex-col justify-between p-2">
          <div className="h-1.5 w-2/3 rounded-full" style={{ background: colors[1] }} />
          <div className="space-y-1">
            <div className="h-1 w-full rounded-full" style={{ background: colors[2] }} />
            <div className="h-1 w-5/6 rounded-full" style={{ background: colors[2] }} />
          </div>
          <div className="flex gap-1">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[3] }} />
            <div className="h-2.5 flex-1 rounded-sm" style={{ background: colors[1] }} />
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-ink">
        {icon}
        {label}
        {active && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
    </button>
  )
}

function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setNotice(null)
    if (!current || !next) {
      setError('Mevcut ve yeni parolayı girin')
      return
    }
    if (next.length < 8) {
      setError('Parola en az 8 karakter olmalıdır')
      return
    }
    if (next !== confirm) {
      setError('Yeni parolalar eşleşmiyor')
      return
    }
    setBusy(true)
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setNotice('Parola güncellendi')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Parola Değiştir" subtitle="Güvenliğiniz için yeni parola en az 8 karakter olmalıdır">
        {notice && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            {notice}
          </div>
        )}
        {error && <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-sub">Mevcut parola</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                className={inputCls + ' pr-10'}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-sub hover:text-ink"
                aria-label={show ? 'Parolayı gizle' : 'Parolayı göster'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-sub">Yeni parola</label>
            <input
              type={show ? 'text' : 'password'}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
              placeholder="En az 8 karakter"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-sub">Yeni parola (tekrar)</label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
              placeholder="Yeni parolayı tekrarlayın"
            />
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Parolayı Güncelle
          </button>
        </div>
      </Card>
    </div>
  )
}

function SecuritySection() {
  const [logs, setLogs] = useState<AuthLog[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setLogs(await api.myLogs())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <Card
        title="Güvenlik"
        subtitle="Hesabınıza yapılan giriş denemeleri (başarılı ve başarısız)"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-sub">Son 50 giriş kaydı</p>
          <button
            onClick={() => void load()}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            Yenile
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>}

        {logs.length === 0 && !busy ? (
          <div className="rounded-xl border border-dashed border-edge py-10 text-center text-sm text-sub/70">
            Henüz giriş kaydı yok.
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-edge/70 bg-surface2/40 px-3 py-2"
              >
                <span
                  className={cn(
                    'inline-flex h-2 w-2 shrink-0 rounded-full',
                    l.success ? 'bg-emerald-500' : 'bg-red-500',
                  )}
                />
                <span className="text-sm font-medium text-ink">
                  {l.success ? 'Başarılı giriş' : 'Başarısız deneme'}
                </span>
                <span className="text-xs text-sub">{l.ip ?? '—'}</span>
                <span className="text-[11px] text-sub/70">{l.identifier}</span>
                <span className="ml-auto shrink-0 text-[11px] text-sub" title={new Date(l.createdAt).toLocaleString('tr-TR')}>
                  {timeAgo(l.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}