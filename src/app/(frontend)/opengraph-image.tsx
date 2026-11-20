import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const alt = BRAND_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  let badgeDataUrl = "";
  try {
    const badgePath = path.join(process.cwd(), "public/brand/ayah-badge-dark.png");
    const buffer = fs.readFileSync(badgePath);
    badgeDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0c1329",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", width: 100, height: 100, marginBottom: 20 }}>
          {badgeDataUrl ? (
            <img
              src={badgeDataUrl}
              alt={BRAND_NAME}
              width="100"
              height="100"
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 96,
                height: 96,
                borderRadius: 22,
                background: "#178f4a",
              }}
            />
          )}
        </div>
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: "-0.02em" }}>{BRAND_NAME}</div>
        <div style={{ fontSize: 36, marginTop: 16, color: "#2ebd6e", fontWeight: 600 }}>
          {BRAND_TAGLINE}
        </div>
      </div>
    ),
    size
  );
}
