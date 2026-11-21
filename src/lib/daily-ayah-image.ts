/**
 * src/lib/daily-ayah-image.ts
 *
 * Canvas-based Daily Ayah image renderer (1080x1350, 4:5 ratio) and pure text-layout utilities.
 */

import { BRAND_NAME } from "./brand";

export const IMAGE_WIDTH = 1080;
export const IMAGE_HEIGHT = 1350;

export interface AyahImageOptions {
  arabic: string;
  translation: string;
  reference: string;
  surah: number;
  ayah: number;
  theme?: "light" | "dark";
  format?: "png" | "jpg";
}

/**
 * Builds the export filename for a daily ayah image.
 * Format: ayah-studio-daily-ayah-{surah}-{ayah}.{png|jpg}
 */
export function buildDailyAyahFilename(
  surah: number,
  ayah: number,
  format: "png" | "jpg" = "png"
): string {
  const s = Math.max(1, Math.min(114, Math.floor(surah || 1)));
  const a = Math.max(1, Math.floor(ayah || 1));
  const ext = format === "jpg" ? "jpg" : "png";
  return `ayah-studio-daily-ayah-${s}-${a}.${ext}`;
}

/**
 * Pure word-wrapping function that splits text into lines fitting within maxWidth.
 * Respects words and wraps safely.
 */
export function wrapWords(
  text: string,
  maxWidth: number,
  measureWidth: (line: string) => number
): string[] {
  if (!text || !text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (measureWidth(candidate) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export interface FontFitResult {
  arSize: number;
  trSize: number;
  arLines: string[];
  trLines: string[];
  totalContentHeight: number;
}

/**
 * Pure auto-shrink font-fitting calculation.
 * If content exceeds availableHeight, reduces translation size first, then Arabic size.
 */
export function calculateFit({
  arabic,
  translation,
  maxWidth,
  availableHeight,
  measureArabic,
  measureTranslation,
  initialArSize = 48,
  minArSize = 26,
  initialTrSize = 30,
  minTrSize = 18,
}: {
  arabic: string;
  translation: string;
  maxWidth: number;
  availableHeight: number;
  measureArabic: (text: string, size: number) => number;
  measureTranslation: (text: string, size: number) => number;
  initialArSize?: number;
  minArSize?: number;
  initialTrSize?: number;
  minTrSize?: number;
}): FontFitResult {
  let arSize = initialArSize;
  let trSize = initialTrSize;

  const tryLayout = (aSize: number, tSize: number) => {
    const arLines = wrapWords(arabic, maxWidth, (t) => measureArabic(t, aSize));
    const trLines = wrapWords(translation, maxWidth, (t) => measureTranslation(t, tSize));
    const arLineHeight = aSize * 2.0; // Amiri Quran needs generous leading for tashkeel
    const trLineHeight = tSize * 1.5;
    const gap = 48; // Gap between Arabic and Translation
    const total = arLines.length * arLineHeight + gap + trLines.length * trLineHeight;
    return { arLines, trLines, total, arLineHeight, trLineHeight };
  };

  let layout = tryLayout(arSize, trSize);

  // Step 1: Reduce translation down to minTrSize if total height exceeds available
  while (layout.total > availableHeight && trSize > minTrSize) {
    trSize = Math.max(minTrSize, trSize - 2);
    layout = tryLayout(arSize, trSize);
  }

  // Step 2: If still too tall, reduce Arabic size down to minArSize
  while (layout.total > availableHeight && arSize > minArSize) {
    arSize = Math.max(minArSize, arSize - 2);
    layout = tryLayout(arSize, trSize);
  }

  // Step 3: If still too tall at minimum sizes, drop translation further down to 14px as last resort
  while (layout.total > availableHeight && trSize > 14) {
    trSize = Math.max(14, trSize - 1);
    layout = tryLayout(arSize, trSize);
  }

  return {
    arSize,
    trSize,
    arLines: layout.arLines,
    trLines: layout.trLines,
    totalContentHeight: layout.total,
  };
}

/**
 * Loads and waits for required fonts in the browser.
 */
export async function ensureFontsLoaded(arSize = 48, trSize = 30): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`${arSize}px "Amiri Quran"`, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
      document.fonts.load(`500 ${trSize}px "Figtree"`, "In the name of Allah"),
      document.fonts.load(`700 24px "Figtree"`, "AYAH STUDIO"),
      document.fonts.load(`400 20px "Figtree"`, "www.ayahstudio.com"),
    ]);
    await document.fonts.ready;
  } catch {
    // If font load times out or errors, canvas will fall back gracefully
  }
}

/**
 * Helper to load an HTMLImageElement safely.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
    if (img.complete && img.naturalWidth) {
      resolve(img);
    }
  });
}

/**
 * Renders the daily ayah card onto a Canvas 2D and returns a Blob (PNG or JPEG).
 */
export async function renderAyahImage({
  arabic,
  translation,
  reference,
  surah,
  ayah,
  theme = "dark",
  format = "png",
}: AyahImageOptions): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("renderAyahImage can only run in a browser environment.");
  }

  // Pre-load fonts
  await ensureFontsLoaded();

  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  const isDark = theme === "dark";

  // Palette
  const bgFill = isDark ? "#0c1329" : "#ffffff";
  const innerCardBg = isDark ? "#141e3d" : "#faf8f5";
  const goldBorder = isDark ? "#4cd68a" : "#c5a059";
  const goldAccent = isDark ? "#4cd68a" : "#178f4a";
  const arTextColor = isDark ? "#f3f6fc" : "#14183a";
  const trTextColor = isDark ? "#cbd5e1" : "#475569";
  const metaTextColor = isDark ? "#94a3b8" : "#64748b";

  // 1. Draw outer background
  ctx.fillStyle = bgFill;
  ctx.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  // 2. Draw card container with double border (luxury gold trim)
  const pad = 54;
  const cardW = IMAGE_WIDTH - pad * 2;
  const cardH = IMAGE_HEIGHT - pad * 2;
  const cornerRadius = 32;

  // Draw card background
  ctx.beginPath();
  ctx.roundRect(pad, pad, cardW, cardH, cornerRadius);
  ctx.fillStyle = innerCardBg;
  ctx.fill();

  // Draw outer gold border
  ctx.lineWidth = 3;
  ctx.strokeStyle = goldBorder;
  ctx.stroke();

  // Draw inner thin gold decorative frame
  const innerInset = 20;
  ctx.beginPath();
  ctx.roundRect(
    pad + innerInset,
    pad + innerInset,
    cardW - innerInset * 2,
    cardH - innerInset * 2,
    cornerRadius - 10
  );
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? "rgba(76, 214, 138, 0.4)" : "rgba(197, 160, 89, 0.5)";
  ctx.stroke();

  // 3. Draw Brand Badge / Logo at top
  const logoSrc = isDark ? "/brand/ayah-badge-dark.png" : "/brand/ayah-badge-light.png";
  try {
    const logoImg = await loadImage(logoSrc);
    const logoSize = 100;
    const logoX = (IMAGE_WIDTH - logoSize) / 2;
    const logoY = pad + innerInset + 40;
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
  } catch {
    // If logo fails to load, gracefully continue with brand text
  }

  // 4. Header title: "AYAH STUDIO — DAILY AYAH"
  const headerY = pad + innerInset + 165;
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '700 18px "Figtree", sans-serif';
  ctx.fillStyle = goldAccent;
  ctx.letterSpacing = "4px";
  ctx.fillText("DAILY AYAH", IMAGE_WIDTH / 2, headerY);
  ctx.letterSpacing = "0px";

  // Decorative divider line under header
  ctx.beginPath();
  ctx.moveTo(IMAGE_WIDTH / 2 - 120, headerY + 24);
  ctx.lineTo(IMAGE_WIDTH / 2 + 120, headerY + 24);
  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? "rgba(76, 214, 138, 0.3)" : "rgba(197, 160, 89, 0.4)";
  ctx.stroke();

  // 5. Measure & Fit Verses
  const textMaxWidth = cardW - 140; // 140px horizontal breathing room inside card
  const topReserved = headerY + 50;
  const bottomReserved = IMAGE_HEIGHT - (pad + innerInset + 110);
  const availableContentHeight = bottomReserved - topReserved;

  // Measurement functions with current canvas context
  const measureArabic = (str: string, size: number) => {
    ctx.font = `${size}px "Amiri Quran", serif`;
    return ctx.measureText(str).width;
  };
  const measureTranslation = (str: string, size: number) => {
    ctx.font = `500 ${size}px "Figtree", sans-serif`;
    return ctx.measureText(str).width;
  };

  const fit = calculateFit({
    arabic,
    translation,
    maxWidth: textMaxWidth,
    availableHeight: availableContentHeight,
    measureArabic,
    measureTranslation,
  });

  const arLineHeight = fit.arSize * 2.0;
  const trLineHeight = fit.trSize * 1.55;
  const gapBetween = 44;
  const totalHeight =
    fit.arLines.length * arLineHeight + gapBetween + fit.trLines.length * trLineHeight;

  // Center the text block vertically in the available content space
  let currentY = topReserved + (availableContentHeight - totalHeight) / 2 + fit.arSize;

  // 6. Draw Arabic Verse (RTL)
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.font = `${fit.arSize}px "Amiri Quran", serif`;
  ctx.fillStyle = arTextColor;

  for (const line of fit.arLines) {
    ctx.fillText(line, IMAGE_WIDTH / 2, currentY);
    currentY += arLineHeight;
  }

  // 7. Draw English Translation (LTR)
  currentY += gapBetween - arLineHeight + fit.trSize;
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.font = `500 ${fit.trSize}px "Figtree", sans-serif`;
  ctx.fillStyle = trTextColor;

  for (const line of fit.trLines) {
    ctx.fillText(line, IMAGE_WIDTH / 2, currentY);
    currentY += trLineHeight;
  }

  // 8. Reference (— Surah Name 2:255)
  const refY = currentY + 28;
  ctx.font = '600 20px "Figtree", sans-serif';
  ctx.fillStyle = goldAccent;
  ctx.fillText(reference.trim(), IMAGE_WIDTH / 2, refY);

  // 9. Footer with site name / URL
  const siteUrl = "aayahstudio.vercel.app";

  const footerY = IMAGE_HEIGHT - (pad + innerInset + 36);
  ctx.font = '500 16px "Figtree", sans-serif';
  ctx.fillStyle = metaTextColor;
  ctx.fillText(`${BRAND_NAME} · ${siteUrl}`, IMAGE_WIDTH / 2, footerY);

  // 10. Export Blob
  return new Promise<Blob>((resolve, reject) => {
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const quality = format === "jpg" ? 0.92 : undefined;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate image blob from canvas"));
      },
      mime,
      quality
    );
  });
}
