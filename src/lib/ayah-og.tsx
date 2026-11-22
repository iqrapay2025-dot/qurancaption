import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { validateAyahParams } from "./ayah-share";
import { getVerses } from "./quran/server";
import { DEFAULT_TR1 } from "./quran/types";
import { BRAND_NAME } from "./brand";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

let cachedBadge: string | null = null;

function loadBadgeDataUrl(): string {
  if (cachedBadge) return cachedBadge;
  const candidates = [
    path.join(process.cwd(), "public", "brand", "ayah-badge-dark-96.png"),
    path.join(process.cwd(), "public", "brand", "ayah-badge-dark-48.png"),
    path.join(process.cwd(), "public", "brand", "ayah-badge-dark.png"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        const buf = fs.readFileSync(/*turbopackIgnore: true*/ p);
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
        translation = v.translations[DEFAULT_TR1] || Object.values(v.translations)[0] || "";
      }
    } catch {}
  }

  // Clean translation if present (trim cleanly on word boundaries)
  let displayTranslation = translation.replace(/\s+/g, " ").trim();
  if (displayTranslation.length > 220) {
    let trimmed = displayTranslation.slice(0, 205);
    const lastSpace = trimmed.lastIndexOf(" ");
    if (lastSpace > 140) {
      trimmed = trimmed.slice(0, lastSpace);
    }
    trimmed = trimmed.replace(/[,;:.!?\-–—]+$/, "");
    displayTranslation = trimmed + "…";
  }

  const trFontSize = displayTranslation.length > 140 ? 21 : 25;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 56px",
          background: "linear-gradient(145deg, #101c3d 0%, #0c1329 55%, #070d1d 100%)",
          color: "#f8fafc",
          position: "relative",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Subtle decorative inner border with gold accents */}
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            right: 18,
            bottom: 18,
            border: "1.5px solid rgba(212, 175, 55, 0.35)",
            borderRadius: 22,
            display: "flex",
          }}
        />

        {/* Top Header Row: Logo & Brand + Daily Ayah Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 10,
          }}
        >
          {/* Brand Logo & Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {badgeDataUrl ? (
              <img
                src={badgeDataUrl}
                alt={BRAND_NAME}
                width={56}
                height={56}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                A
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "#ffffff",
                  }}
                >
                  {BRAND_NAME}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid rgba(16, 185, 129, 0.45)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#34d399",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
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
                The Holy Quran • Recitation & Studio
              </span>
            </div>
          </div>

          {/* Surah Reference Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 22px",
              borderRadius: 30,
              background: "rgba(212, 175, 55, 0.14)",
              border: "1.5px solid rgba(212, 175, 55, 0.5)",
            }}
          >
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#d4af37",
                letterSpacing: "0.02em",
              }}
            >
              {refText}
            </span>
          </div>
        </div>

        {/* Center Main Content: Prominent Surah & Verse Number Showcase */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "24px 36px",
            flex: 1,
            zIndex: 10,
          }}
        >
          {/* Golden Subtitle */}
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#d4af37",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 10,
            }}
          >
            Verse of the Day
          </span>

          {/* Huge Surah Name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 54,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              marginBottom: 12,
            }}
          >
            <span>{`Surah ${surahName}`}</span>
          </div>

          {/* Verse Number Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 18px",
              borderRadius: 20,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              fontSize: 18,
              fontWeight: 600,
              color: "#f1f5f9",
              marginBottom: displayTranslation ? 18 : 0,
            }}
          >
            <span>{`Ayah ${ayahNum}`}</span>
            <span style={{ color: "#64748b" }}>•</span>
            <span style={{ color: "#94a3b8" }}>{`Chapter ${surahNum}`}</span>
          </div>

          {/* Translation Quote (if available) */}
          {displayTranslation ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: trFontSize,
                lineHeight: 1.55,
                color: "#cbd5e1",
                textAlign: "center",
                maxWidth: 960,
                fontWeight: 400,
                fontStyle: "italic",
              }}
            >
              {`“${displayTranslation}”`}
            </div>
          ) : null}
        </div>

        {/* Bottom Footer Row: Platform Features + Website Link */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: 16,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#d4af37" }}>
              Aayah Studio
            </span>
            <span style={{ fontSize: 14, color: "#64748b" }}>•</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8" }}>
              Read, Listen & Create Quran Video Captions
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 20,
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: "#34d399", letterSpacing: "0.01em" }}>
              aayahstudio.vercel.app
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
    }
  );
}
