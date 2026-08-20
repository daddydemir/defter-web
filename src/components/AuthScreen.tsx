import { useState } from 'react'
import { api } from '../api'
import type { AuthUser } from '../lib/auth'
import { Logo } from './Logo'
import { cn } from '../lib/format'

interface AuthScreenProps {
  onAuthed: (token: string, user: AuthUser) => void
}

export function AuthScreen({ onAuthed }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const res =
        mode === 'login' ? await api.login(email, password) : await api.register(username, email, password)
      onAuthed(res.token, res.user)
    } catch (err) {
      setError((err as Error).message || 'Bir şeyler ters gitti')
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
            <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
            <p className="mt-1 text-sm text-sub">Notlarınız tek yerde</p>
          </div>
        </div>

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

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (mode === 'login' ? 'Giriş yapılıyor…' : 'Hesap oluşturuluyor…') : mode === 'login' ? 'Giriş yap' : 'Kayıt ol'}
          </button>
        </form>
      </div>
    </div>
  )
}