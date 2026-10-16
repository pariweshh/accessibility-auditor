import { ImageResponse } from "next/og"
import { SITE } from "@/lib/site"

export const alt = SITE.title
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #020617 0%, #1e1b4b 55%, #0f172a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 34,
            fontWeight: 700,
            color: "#a5b4fc",
            marginBottom: 28,
          }}
        >
          <svg
            width="52"
            height="52"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="60" cy="27" r="10" fill="#38bdf8" />
            <circle cx="60" cy="27" r="4.5" fill="#ffffff" />
            <path
              d="M34 94 L54 44 C56 38 64 38 66 44 L86 94"
              stroke="#818cf8"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M40 73 Q60 58 80 73"
              stroke="#38bdf8"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
          {SITE.name}
        </div>
        <div
          style={{
            fontSize: 70,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: 900,
          }}
        >
          Web Accessibility. Remediated by AI.
        </div>
        <div style={{ fontSize: 30, color: "#94a3b8", marginTop: 28, maxWidth: 880 }}>
          Scan any site for WCAG violations and get drop-in HTML fixes.
        </div>
      </div>
    ),
    { ...size }
  )
}
