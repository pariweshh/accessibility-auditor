import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a, #020617)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Beacon Head */}
          <circle cx="60" cy="27" r="10" fill="#38bdf8" />
          <circle cx="60" cy="27" r="4.5" fill="#ffffff" />

          {/* 'A' Legs */}
          <path
            d="M34 94 L54 44 C56 38 64 38 66 44 L86 94"
            stroke="#6366f1"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Open Arms Arc */}
          <path
            d="M40 73 Q60 58 80 73"
            stroke="#38bdf8"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
