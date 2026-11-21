import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { parseSurahParam, SURAH_NAMES_SIMPLE } from "@/lib/quran/reader";
import { getChapters } from "@/lib/quran/server";
import { BRAND_NAME } from "@/lib/brand";

export const alt = "Ayah Studio — Surah Reader";
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
  params: Promise<{ surah: string }>;
}) {
  const { surah: surahParam } = await params;
  const surahId = parseSurahParam(surahParam) || 1;
  const badgeDataUrl = loadBadge();
  const amiriFont = loadFont();

  let nameSimple = SURAH_NAMES_SIMPLE[surahId - 1] || `Surah ${surahId}`;
  let nameArabic = "";
  let meaning = "";
  let versesCount = 0;

  try {
    const { chapters } = await getChapters();
    const chapter = chapters.find((c) => c.id === surahId);
    if (chapter) {
      nameSimple = chapter.nameSimple;
      nameArabic = chapter.nameArabic;
      meaning = chapter.meaning;
      versesCount = chapter.versesCount;
    }
  } catch {}

  const fontsConfig: any[] = [];
  if (amiriFont) {
    fontsConfig.push({
      name: "Amiri",
      data: amiriFont,
      style: "normal",
      weight: 400,
    });
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
        {/* Subtle decorative inner border */}
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

        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {badgeDataUrl ? (
              <img
                src={badgeDataUrl}
                alt={BRAND_NAME}
                width="52"
                height="52"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#178f4a",
                }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
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
              padding: "8px 20px",
              borderRadius: 30,
              background: "rgba(197, 160, 89, 0.15)",
              border: "1px solid rgba(197, 160, 89, 0.45)",
              fontSize: 16,
              fontWeight: 700,
              color: "#c5a059",
            }}
          >
            Surah #{surahId}
          </div>
        </div>

        {/* Middle Surah Showcase */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            zIndex: 10,
            flex: 1,
            padding: "20px 0",
          }}
        >
          {nameArabic ? (
            <div
              style={{
                fontFamily: amiriFont ? "Amiri, serif" : "serif",
                fontSize: 68,
                color: "#f8fafc",
                direction: "rtl",
                marginBottom: 12,
              }}
            >
              {nameArabic}
            </div>
          ) : null}

          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              marginBottom: 10,
            }}
          >
            Surah {nameSimple}
          </div>

          <div
            style={{
              fontSize: 22,
              color: "#2ebd6e",
              fontWeight: 600,
            }}
          >
            {meaning ? `${meaning} · ` : ""}
            {versesCount ? `${versesCount} Verses` : ""}
          </div>
        </div>

        {/* Bottom Footer */}
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
          <span style={{ fontSize: 16, color: "#94a3b8" }}>
            Read authentic translations and classical tafsir
          </span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#c5a059" }}>
            {siteDomain}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontsConfig.length > 0 ? fontsConfig : undefined,
    }
  );
}
