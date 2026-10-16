import React from "react"

interface BrandLogoProps {
  size?: number
  className?: string
  withBackground?: boolean
  showWordmark?: boolean
  wordmarkClassName?: string
  subtitle?: string
}

export function BrandLogo({
  size = 32,
  className = "",
  withBackground = true,
  showWordmark = false,
  wordmarkClassName = "",
  subtitle,
}: BrandLogoProps) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="A11ytica Pro Universal Beacon Logo"
      role="img"
    >
      <defs>
        <linearGradient id="a11y_beacon_bg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
        <linearGradient id="a11y_beacon_legs" x1="30" y1="30" x2="90" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="45%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
        <linearGradient id="a11y_beacon_arms" x1="35" y1="65" x2="85" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0ea5e9" />
          <stop offset="50%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#a855f7" />
        </linearGradient>
        <filter id="a11y_beacon_glow" x="40" y="7" width="40" height="40" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded squircle card background */}
      {withBackground && (
        <>
          <rect width="120" height="120" rx="28" fill="url(#a11y_beacon_bg)" />
          <rect
            width="118"
            height="118"
            x="1"
            y="1"
            rx="27"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
          />
        </>
      )}

      {/* Ground subtle glow shadow */}
      <ellipse cx="60" cy="100" rx="22" ry="3" fill="rgba(99,102,241,0.25)" />

      {/* Stylized 'A' Wings / Legs */}
      <path
        d="M36 93 L54 44 C56 39 64 39 66 44 L84 93"
        stroke="url(#a11y_beacon_legs)"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Welcoming Open Arms Crossbar */}
      <path
        d="M41 73 Q60 59 79 73"
        stroke="url(#a11y_beacon_arms)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Radiant Beacon Head (Universal Human Focus) */}
      <circle cx="60" cy="27" r="8" fill="#38bdf8" filter="url(#a11y_beacon_glow)" />
      <circle cx="60" cy="27" r="3.5" fill="#ffffff" />
    </svg>
  )

  if (!showWordmark) {
    return icon
  }

  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex flex-col">
        <span
          className={`font-black tracking-tight text-white font-display text-base md:text-lg flex items-center gap-1.5 leading-none ${wordmarkClassName}`}
        >
          A11ytica{" "}
          <span className="bg-linear-to-r from-indigo-400 via-sky-400 to-indigo-300 bg-clip-text text-transparent">
            Pro
          </span>
        </span>
        {subtitle && (
          <span className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
