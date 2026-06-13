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
          <span style={{ fontSize: 44 }}>🎯</span>
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
