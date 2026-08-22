import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { AuthUser } from '../lib/auth'
import { Logo } from './Logo'
import { cn } from '../lib/format'
import QRCode from 'qrcode'
import { Loader2, QrCode, RefreshCw } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'

const siteKey = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_TURNSTILE_SITEKEY ?? '').trim() || undefined

interface AuthScreenProps {
  onAuthed: (token: string, user: AuthUser) => void
}

export function AuthScreen({ onAuthed }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showQr, setShowQr] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (siteKey && !captchaToken) {
      setError('Lütfen robot doğrulamasını tamamlayın')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password, captchaToken ?? undefined)
          : await api.register(username, email, password, captchaToken ?? undefined)
      onAuthed(res.token, res.user)
    } catch (err) {
      const msg = (err as Error).message || 'Bir şeyler ters gitti'
      setError(msg)
      if (/captcha/i.test(msg)) {
        setCaptchaToken(null)
        setCaptchaKey((k) => k + 1)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base px-4 py-10 text-ink">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="h-14 w-14 drop-shadow-lg" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Defter</h1>
            <p className="mt-1 text-sm text-sub">Notlarınız tek yerde</p>
          </div>
        </div>

        {showQr ? (
          <QrLoginPanel onAuthed={onAuthed} onBack={() => setShowQr(false)} />
        ) : (
          <form
            onSubmit={submit}
            className="dialog-enter rounded-2xl border border-edge bg-surface p-6 shadow-2xl"
          >
            <div className="flex gap-1 rounded-lg bg-surface2 p-1 ring-1 ring-edge">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    setError(null)
                  }}
                  className={cn(
                    'min-h-9 flex-1 rounded-md text-sm font-medium transition-colors',
                    mode === m ? 'bg-surface text-ink shadow-sm' : 'text-sub hover:text-ink',
                  )}
                >
                  {m === 'login' ? 'Giriş yap' : 'Kayıt ol'}
                </button>
              ))}
            </div>

            {mode === 'register' && (
              <label className="mt-5 block">
                <span className="mb-1.5 block text-xs font-medium text-sub">
                  Kullanıcı adı<span className="text-sub/60"> (3-20 karakter, arkadaşlarınız sizi bununla bulur)</span>
                </span>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ahmet_kaya"
                  className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-base text-ink outline-none placeholder:text-sub/50 focus:border-accent"
                />
              </label>
            )}

            <label className={cn('block', mode === 'register' && 'mt-3.5')}>
              <span className="mb-1.5 block text-xs font-medium text-sub">
                {mode === 'login' ? 'E-posta veya kullanıcı adı' : 'E-posta'}
              </span>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'you@example.com veya kullanıcı adı' : 'you@example.com'}
                className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-base text-ink outline-none placeholder:text-sub/50 focus:border-accent"
              />
            </label>

            <label className="mt-3.5 block">
              <span className="mb-1.5 block text-xs font-medium text-sub">
                Parola{mode === 'register' && <span className="text-sub/60"> (en az 8 karakter)</span>}
              </span>
              <input
                type="password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-base text-ink outline-none placeholder:text-sub/50 focus:border-accent"
              />
            </label>

            {siteKey && (
              <div className="mt-4 flex justify-center">
                <Turnstile
                  key={captchaKey}
                  siteKey={siteKey}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  options={{ theme: 'auto' }}
                />
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || (!!siteKey && !captchaToken)}
              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (mode === 'login' ? 'Giriş yapılıyor…' : 'Hesap oluşturuluyor…') : mode === 'login' ? 'Giriş yap' : 'Kayıt ol'}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-edge" />
              <span className="text-xs text-sub">veya</span>
              <div className="h-px flex-1 bg-edge" />
            </div>

            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-surface2 px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              <QrCode className="h-4 w-4" />
              QR kod ile giriş
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function QrLoginPanel({ onAuthed, onBack }: { onAuthed: (token: string, user: AuthUser) => void; onBack: () => void }) {
  const [code, setCode] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)

  const start = useCallback(async () => {
    setError(null)
    setQrUrl(null)
    setWaiting(false)
    setRemaining(0)
    try {
      const r = await api.pairStart()
      setCode(r.code)
      const exp = Date.now() + r.expiresIn * 1000
      setExpiresAt(exp)
      setRemaining(r.expiresIn)
      const url = `${window.location.origin}/pair?code=${encodeURIComponent(r.code)}`
      const dataUrl = await QRCode.toDataURL(url, { width: 260, margin: 1, color: { dark: '#0c0c10', light: '#ffffff' } })
      setQrUrl(dataUrl)
      setWaiting(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    void start()
  }, [start])

  // Geri sayım
  useEffect(() => {
    if (!expiresAt) return
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
      setRemaining(r)
      if (r <= 0) setWaiting(false)
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  // Poll: onay bekleniyor mu?
  useEffect(() => {
    if (!code || !waiting) return
    let cancelled = false
    let timer: number | undefined
    const poll = async () => {
      try {
        const r = await api.pairWait(code)
        if (cancelled) return
        // r.status === 'pending' ise beklemeye devam; approved ise token/user döner
        const maybeApproved = r as { status: string; token?: string; user?: AuthUser }
        if (maybeApproved.status === 'approved' && maybeApproved.token && maybeApproved.user) {
          onAuthed(maybeApproved.token, maybeApproved.user)
          return
        }
      } catch (err) {
        const msg = (err as Error).message
        // süresi doldu / kullanıldı durumlarında QR'ı yenileme öner
        if (/süresi|geçersiz|kullanıldı/i.test(msg)) {
          if (!cancelled) {
            setWaiting(false)
            setError(msg)
          }
          return
        }
        // diğer geçici hatalarda sessizce devam et
      }
      if (!cancelled && waiting) timer = window.setTimeout(poll, 2500)
    }
    poll()
    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [code, waiting, onAuthed])

  const expired = remaining <= 0 && !!code

  return (
    <div className="dialog-enter rounded-2xl border border-edge bg-surface p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <QrCode className="h-4 w-4 text-accent" />
          QR kod ile giriş
        </h2>
        <button onClick={onBack} className="rounded-lg px-2 py-1 text-xs font-medium text-sub hover:text-ink">
          Parola ile girişe dön
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-sub">
        Giriş yapmış cihazındaki Defter uygulamasından bu QR'ı tara ve onayla.
      </p>

      <div className="mt-4 flex flex-col items-center">
        <div className="flex h-[260px] w-[260px] items-center justify-center overflow-hidden rounded-xl border border-edge bg-white p-2">
          {!qrUrl ? (
            <Loader2 className="h-6 w-6 animate-spin text-sub" />
          ) : expired ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium text-ink">Süre doldu</p>
              <button
                onClick={start}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Yenile
              </button>
            </div>
          ) : (
            <img src={qrUrl} alt="QR kod" width={260} height={260} className="h-full w-full object-contain" />
          )}
        </div>

        {code && !expired && (
          <div className="mt-3 flex items-center gap-2 text-xs text-sub">
            <span className={cn('h-2 w-2 rounded-full', waiting ? 'animate-pulse bg-emerald-500' : 'bg-sub/40')} />
            {waiting ? (
              <span>
                Onay bekleniyor · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </span>
            ) : (
              <span>Beklemede</span>
            )}
          </div>
        )}

        {error && <p className="mt-3 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}

        <button
          onClick={start}
          disabled={!code}
          className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yeni kod oluştur
        </button>
      </div>
    </div>
  )
}
