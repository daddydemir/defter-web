import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Check, Loader2, ShieldCheck, X } from 'lucide-react'

export function PairApprovePage({ code, onDone }: { code: string; onDone: () => void }) {
  const [info, setInfo] = useState<{ createdAt: string; expiresAt: string; deviceUa: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.pairInfo(code)
      setInfo({ createdAt: r.createdAt, expiresAt: r.expiresAt, deviceUa: r.deviceUa })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    void load()
  }, [load])

  const approve = async () => {
    if (approving || approved) return
    setApproving(true)
    setError(null)
    try {
      await api.pairApprove(code)
      setApproved(true)
      setTimeout(onDone, 1500)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-base text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
        <div className="relative rounded-2xl border border-edge bg-surface p-6 shadow-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-accent" />
            QR Girişi Onayla
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-sub">
              <Loader2 className="h-4 w-4 animate-spin" />
              Doğruluyor…
            </div>
          ) : error && !info ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>
          ) : approved ? (
            <div className="mt-6 flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-ink">Onaylandı — diğer cihaz giriş yapıyor</p>
              <p className="text-xs text-sub">Bu pencereyi kapatabilirsin.</p>
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-sub">
                Başka bir cihaz Defter hesabına giriş yapmak istiyor. Onaylıyor musun?
              </p>
              {info && (
                <div className="mt-3 rounded-lg bg-surface2 px-3 py-2 text-xs text-sub ring-1 ring-edge">
                  <div>İstek: {new Date(info.createdAt).toLocaleTimeString('tr-TR')}</div>
                  {info.deviceUa && <div className="mt-1 truncate opacity-70">{info.deviceUa}</div>}
                </div>
              )}
              {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={onDone}
                  className="flex-1 rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface2"
                >
                  Vazgeç
                </button>
                <button
                  onClick={approve}
                  disabled={approving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Onayla ve giriş yaptır
                </button>
              </div>
            </>
          )}

          <button
            onClick={onDone}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
