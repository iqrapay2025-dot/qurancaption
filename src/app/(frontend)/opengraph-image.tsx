import { ImageResponse } from "next/og"

export const alt = "Quran Caption Studio"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b1f3a", color: "#fff" }}>
        <div style={{ display: "flex", width: 96, height: 96, borderRadius: 22, background: "#178f4a", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", width: 52, height: 52, border: "6px solid #fff", borderRadius: 10 }} />
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 40 }}>Quran Caption Studio</div>
        <div style={{ fontSize: 38, marginTop: 16, color: "#6fe3a0" }}>Synced Arabic and translation captions. Export SRT and VTT.</div>
      </div>
    ),
    size,
  )
}
