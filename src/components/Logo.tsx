import { useId } from 'react'

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill={`url(#${id})`} />
      <path
        d="M16 14h10l8 8v12a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3Z"
        fill="#fff"
        fillOpacity="0.96"
      />
      <path d="M26 14v8h8" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="19" y1="28" x2="29" y2="28" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="19" y1="33" x2="26" y2="33" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}