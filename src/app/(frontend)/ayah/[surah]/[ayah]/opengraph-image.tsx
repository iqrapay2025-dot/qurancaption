import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { validateAyahParams, calculateOgFontSize } from "@/lib/ayah-share";
import { getVerses } from "@/lib/quran/server";
import { DEFAULT_TR1 } from "@/lib/quran/types";
import { BRAND_NAME } from "@/lib/brand";

export const alt = "Ayah Studio — Holy Quran Ayah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function loadFont(): ArrayBuffer | null {
  try {
    const fontPath = path.join(process.cwd(), "public/fonts/Amiri-Regular.ttf");
    if (fs.existsSync(fontPath)) {
      const buf = fs.readFileSync(fontPath);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }
  } catch {}
  try {
    const fontPath = path.join(process.cwd(), "src/assets/fonts/Amiri-Regular.ttf");
    if (fs.existsSync(fontPath)) {
      const buf = fs.readFileSync(fontPath);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }
  } catch {}
  return null;
}

function loadBadge(): string {
  try {
    const badgePath = path.join(process.cwd(), "public/brand/ayah-badge-dark.png");
    const buffer = fs.readFileSync(badgePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ surah: string; ayah: string }>;
}) {
  const { surah: surahStr, ayah: ayahStr } = await params;
  const valid = validateAyahParams(surahStr, ayahStr);
  const badgeDataUrl = loadBadge();
  const amiriFont = loadFont();

  let arabic = "";
  let translation = "";
  let surahName = valid?.surahName || "The Holy Quran";
  const refText = valid ? `${surahName} ${valid.surah}:${valid.ayah}` : "Ayah Studio";

  if (valid) {
    try {
      const res = await getVerses(valid.surah, valid.ayah, valid.ayah, [DEFAULT_TR1]);
      const v = res.verses[0];
      if (v) {
        arabic = v.arabic || "";
        translation = v.translations[DEFAULT_TR1] || Object.values(v.translations)[0] || "";
      }
    } catch {}
  }

  // Auto-scale font sizes
  const totalLen = (arabic.length || 0) + (translation.length || 0);
  const { trSize } = calculateOgFontSize(totalLen);

  let displayTranslation = translation;
  if (displayTranslation.length > 320) {
    displayTranslation = displayTranslation.slice(0, 300).trim() + " …";
  }

  const siteDomain = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "aayahstudio.vercel.app";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "54px 64px",
          background: "#0c1329",
          color: "#fff",
          position: "relative",
        }}
      >
        {/* Subtle decorative inner frame */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "1.5px solid rgba(197, 160, 89, 0.35)",
            borderRadius: 24,
            display: "flex",
          }}
        />

        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {badgeDataUrl ? (
              <img
                src={badgeDataUrl}
                alt={BRAND_NAME}
                width="48"
                height="48"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#178f4a",
                }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  color: "#f8fafc",
                }}
              >
                {BRAND_NAME}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2ebd6e",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                The Holy Quran
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 30,
              background: "rgba(197, 160, 89, 0.15)",
              border: "1px solid rgba(197, 160, 89, 0.45)",
              fontSize: 16,
              fontWeight: 700,
              color: "#c5a059",
            }}
          >
            {refText}
          </div>
        </div>

        {/* Center Verse Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
            zIndex: 10,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: Math.max(trSize, 22),
              lineHeight: 1.6,
              color: "#f8fafc",
              maxWidth: 960,
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            &ldquo;{displayTranslation}&rdquo;
          </div>
        </div>

        {/* Bottom Footer Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 10,
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: 16,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#c5a059" }}>
            — Surah {refText}
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#94a3b8" }}>
            {siteDomain}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
