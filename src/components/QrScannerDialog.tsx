import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

function extractCode(text: string): string | null {
  const t = text.trim()
  // QR ya ham kod, ya da ".../pair?code=XXXX" URL'si olabilir
  try {
    const u = new URL(t)
    const c = u.searchParams.get('code')
    if (c) return c
  } catch {
    /* raw code, not a URL */
  }
  // ham base64url kodu gibi görünüyorsa doğrudan al
  if (/^[A-Za-z0-9_-]{20,200}$/.test(t)) return t
  return null
}

export function QrScannerDialog({
  open,
  onScan,
  onClose,
}: {
  open: boolean
  onScan: (code: string) => void
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const scannedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    scannedRef.current = false
    setError(null)
    setUnsupported(false)

    let cancelled = false

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setUnsupported(true)
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        // jsQR lazy-load — sadece scanner açıldığında import edilir
        const jsQR = (await import('jsqr')).default as unknown as (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return

        const tick = () => {
          if (cancelled || scannedRef.current || !video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick)
            return
          }
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const result = jsQR(img.data, img.width, img.height)
          if (result?.data) {
            const code = extractCode(result.data)
            if (code) {
              scannedRef.current = true
              onScan(code)
              return
            }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Kamera açılamadı. İzin verdiğinden emin ol.')
      }
    }

    void start()

    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [open, onScan])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Camera className="h-4 w-4" />
          QR tara
        </span>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Hedef çerçevesi */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(68vw,320px)] w-[min(68vw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        <p className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white">
          QR kodu çerçevenin içine hizala
        </p>
      </div>

      {unsupported && (
        <div className="px-4 py-3 text-center text-sm text-white/80">
          Bu tarayıcı kamera erişimini desteklemiyor. Lütfen sistem kamerasıyla QR'ı tarayıp açılan bağlantıyı kullan.
        </div>
      )}
      {error && <div className="px-4 py-3 text-center text-sm text-red-300">{error}</div>}
    </div>
  )
}
