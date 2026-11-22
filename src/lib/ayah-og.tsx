import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { validateAyahParams } from "./ayah-share";
import { getVerses } from "./quran/server";
import { DEFAULT_TR1 } from "./quran/types";
import { BRAND_NAME } from "./brand";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

let cachedFont: ArrayBuffer | null = null;
let cachedBadge: string | null = null;

function loadArabicFont(): ArrayBuffer | null {
  if (cachedFont) return cachedFont;
  const candidates = [
    path.join(process.cwd(), "public/fonts/Almarai-Regular.ttf"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        cachedFont = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
        return cachedFont;
      }
    } catch {}
  }
  return null;
}

function loadBadgeDataUrl(): string {
  if (cachedBadge) return cachedBadge;
  const candidates = [
    path.join(process.cwd(), "public/brand/ayah-badge-dark-96.png"),
    path.join(process.cwd(), "public/brand/ayah-badge-dark-48.png"),
    path.join(process.cwd(), "public/brand/ayah-badge-dark.png"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        cachedBadge = `data:image/png;base64,${buf.toString("base64")}`;
        return cachedBadge;
      }
    } catch {}
  }
  return "";
}

export async function createAyahOgImageResponse(surahParam: unknown, ayahParam: unknown): Promise<ImageResponse> {
  const valid = validateAyahParams(surahParam, ayahParam);
  const badgeDataUrl = loadBadgeDataUrl();
  const arabicFont = loadArabicFont();

  let arabic = "";
  let translation = "";
  const surahName = valid?.surahName || "The Holy Quran";
  const surahNum = valid?.surah || 1;
  const ayahNum = valid?.ayah || 1;
  const refText = `Surah ${surahName} • ${surahNum}:${ayahNum}`;

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

  // Auto-scale fonts & trim gracefully so card never overflows 630px
  let arFontSize = 32;
  let trFontSize = 21;
  let displayArabic = arabic;
  let displayTranslation = translation;

  if (arabic.length > 200) {
    arFontSize = 23;
    trFontSize = 17;
    if (arabic.length > 260) {
      displayArabic = arabic.slice(0, 240).trim() + " ۚ …";
    }
  } else if (arabic.length > 90) {
    arFontSize = 27;
    trFontSize = 19;
  } else {
    arFontSize = 36;
    trFontSize = 23;
  }

  if (displayTranslation.length > 260) {
    displayTranslation = displayTranslation.slice(0, 240).trim() + "…";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "46px 56px",
          background: "linear-gradient(145deg, #101c3d 0%, #0c1329 55%, #070d1d 100%)",
          color: "#f8fafc",
          position: "relative",
        }}
      >
        {/* Subtle decorative inner frame */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            bottom: 20,
            border: "1.5px solid rgba(212, 175, 55, 0.35)",
            borderRadius: 20,
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
          }}
        >
          {/* Brand Logo & Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {badgeDataUrl ? (
              <img
                src={badgeDataUrl}
                alt={BRAND_NAME}
                width={52}
                height={52}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#178f4a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                A
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    color: "#ffffff",
                  }}
                >
                  {BRAND_NAME}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(30, 166, 90, 0.25)",
                    border: "1px solid rgba(46, 189, 110, 0.4)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#4cd68a",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Daily Ayah
                </span>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#94a3b8",
                  marginTop: 2,
                }}
              >
                The Holy Quran • Recitation & Captions
              </span>
            </div>
          </div>

          {/* Surah Reference Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 20px",
              borderRadius: 30,
              background: "rgba(212, 175, 55, 0.15)",
              border: "1.5px solid rgba(212, 175, 55, 0.45)",
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#d4af37",
                letterSpacing: "0.02em",
              }}
            >
              {refText}
            </span>
          </div>
        </div>

        {/* Center Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "16px 28px",
            flex: 1,
          }}
        >
          {displayArabic ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontFamily: arabicFont ? "Almarai" : "sans-serif",
                fontSize: arFontSize,
                lineHeight: 1.8,
                color: "#ffffff",
                textAlign: "center",
                direction: "rtl",
                maxWidth: 1060,
                marginBottom: 14,
              }}
            >
              {displayArabic}
            </div>
          ) : null}

          {displayTranslation ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: trFontSize,
                lineHeight: 1.5,
                color: "#cbd5e1",
                textAlign: "center",
                maxWidth: 1000,
                fontWeight: 400,
              }}
            >
              {`“${displayTranslation}”`}
            </div>
          ) : null}
        </div>

        {/* Bottom Footer Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#d4af37" }}>
              {`— Surah ${surahName} ${surahNum}:${ayahNum}`}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
              Read, listen & create at
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#4cd68a" }}>
              aayahstudio.vercel.app
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
      fonts: arabicFont
        ? [
            {
              name: "Almarai",
              data: arabicFont,
              style: "normal",
              weight: 400,
            },
          ]
        : undefined,
    }
  );
}
