import { NextResponse } from "next/server";
import { type ListenReciter, sortListenReciters } from "@/lib/listen/mp3quran";
import { EVERYAYAH_ADDITIONAL_RECITERS } from "@/lib/quran/server";

const FALLBACK_RECITERS: ListenReciter[] = [
  {
    id: 123,
    name: "Mishary Alafasi",
    nameArabic: "مشاري العفاسي",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/mishary-alafasy/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 54,
    name: "Abdulrahman Alsudaes",
    nameArabic: "عبدالرحمن السديس",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 31,
    name: "Saud Al-Shuraim",
    nameArabic: "سعود الشريم",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/saud-shuraim/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 102,
    name: "Maher Al Meaqli",
    nameArabic: "ماهر المعيقلي",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/maher-muaiqly/r3/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 30,
    name: "Saad Al-Ghamdi",
    nameArabic: "سعد الغامدي",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/saad-ghamdi/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 51,
    name: "Abdulbasit Abdulsamad",
    nameArabic: "عبدالباسط عبدالصمد",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 118,
    name: "Mahmoud Khalil Al-Hussary (Murattal)",
    nameArabic: "محمود خليل الحصري - مرتل",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/mahmoud-husary/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 11802,
    name: "Mahmoud Khalil Al-Hussary (Mujawwad)",
    nameArabic: "محمود خليل الحصري - مجود",
    style: "Hafs A'n Assem - Almusshaf Al Mojawwad",
    server: "https://cdn.mp3quran.net/audio/mahmoud-husary/r2/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 112,
    name: "Mohammed Siddiq Al-Minshawi",
    nameArabic: "محمد صديق المنشاوي",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/muhammad-minshawi/r3/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 92,
    name: "Yasser Al-Dosari",
    nameArabic: "ياسر الدوسري",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/yasser-dosari/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 4,
    name: "Shaik Abu Bakr Al Shatri",
    nameArabic: "شيخ أبو بكر الشاطري",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/abubakr-shatri/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 86,
    name: "Nasser Alqatami",
    nameArabic: "ناصر القطامي",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/nasser-qatami/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 221,
    name: "Raad Al Kurdi",
    nameArabic: "رعد محمد الكردي",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/raad-kurdi/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
  {
    id: 12,
    name: "Idrees Abkr",
    nameArabic: "إدريس أبكر",
    style: "Hafs A'n Assem - Murattal",
    server: "https://cdn.mp3quran.net/audio/idrees-abkar/r1/",
    surahTotal: 114,
    surahList: Array.from({ length: 114 }, (_, i) => i + 1),
  },
];

let cachedReciters: ListenReciter[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  const now = Date.now();
  if (cachedReciters && now - cacheTime < CACHE_TTL_MS) {
    return NextResponse.json(
      { reciters: cachedReciters },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  }

  try {
    const [engRes, arRes] = await Promise.all([
      fetch("https://mp3quran.net/api/v3/reciters?language=eng", {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(8000),
      }),
      fetch("https://mp3quran.net/api/v3/reciters?language=ar", {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    if (!engRes.ok) throw new Error(`HTTP ${engRes.status}`);

    const engData = await engRes.json();
    const arData = arRes.ok ? await arRes.json().catch(() => null) : null;
    const arMap = new Map<number, string>();
    if (Array.isArray(arData?.reciters)) {
      for (const r of arData.reciters) {
        if (r.id && r.name) arMap.set(r.id, r.name);
      }
    }

    if (Array.isArray(engData?.reciters) && engData.reciters.length > 0) {
      const parsed: ListenReciter[] = [];

      for (const r of engData.reciters) {
        if (!r.id || !r.name || !Array.isArray(r.moshaf) || r.moshaf.length === 0) continue;

        // Prefer Murattal Hafs (especially for Mahmoud Khalil Al-Husary), then general complete Hafs
        const murattalHafs = r.moshaf.find(
          (m: any) => m.rewaya_id === 1 && m.surah_total === 114 && /murattal/i.test(m.name)
        );
        const hafs114 = r.moshaf.find((m: any) => m.rewaya_id === 1 && m.surah_total === 114);
        const complete114 = r.moshaf.find((m: any) => m.surah_total === 114);
        const hafs = r.moshaf.find((m: any) => m.rewaya_id === 1);
        const moshaf = murattalHafs || hafs114 || complete114 || hafs || r.moshaf[0];

        if (!moshaf || typeof moshaf.server !== "string" || !moshaf.server.startsWith("http")) {
          continue;
        }

        const surahList: number[] =
          typeof moshaf.surah_list === "string"
            ? moshaf.surah_list
                .split(",")
                .map((n: string) => Number(n.trim()))
                .filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 114)
            : Array.from({ length: moshaf.surah_total || 114 }, (_, i) => i + 1);

        const reciterName = r.id === 118 ? "Mahmoud Khalil Al-Hussary (Murattal)" : r.name;

        parsed.push({
          id: r.id,
          name: reciterName,
          nameArabic: arMap.get(r.id) || null,
          style: moshaf.name || null,
          server: moshaf.server.endsWith("/") ? moshaf.server : `${moshaf.server}/`,
          surahTotal: moshaf.surah_total || surahList.length,
          surahList,
        });

        // If reciter is Al-Husary, also add his Mujawwad recitation as a distinct option
        if (r.id === 118) {
          const mujawwad = r.moshaf.find((m: any) => /mojawwad|mujawwad/i.test(m.name));
          if (mujawwad && typeof mujawwad.server === "string") {
            const mList: number[] =
              typeof mujawwad.surah_list === "string"
                ? mujawwad.surah_list
                    .split(",")
                    .map((n: string) => Number(n.trim()))
                    .filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 114)
                : Array.from({ length: mujawwad.surah_total || 114 }, (_, i) => i + 1);
            parsed.push({
              id: 11802,
              name: "Mahmoud Khalil Al-Hussary (Mujawwad)",
              nameArabic: arMap.get(r.id) ? `${arMap.get(r.id)} - مجود` : null,
              style: mujawwad.name || "Hafs A'n Assem - Almusshaf Al Mojawwad",
              server: mujawwad.server.endsWith("/") ? mujawwad.server : `${mujawwad.server}/`,
              surahTotal: mujawwad.surah_total || mList.length,
              surahList: mList,
            });
          }
        }
      }

      // Merge EveryAyah reciters so they are available on /listen too
      const existingIds = new Set(parsed.map((p) => p.id));
      for (const ea of EVERYAYAH_ADDITIONAL_RECITERS) {
        if (!existingIds.has(ea.id)) {
          parsed.push({
            id: ea.id,
            name: ea.name,
            nameArabic: ea.nameArabic,
            style: ea.style ? `Hafs A'n Assem - ${ea.style}` : "Hafs A'n Assem",
            server:
              ea.id === 14
                ? "https://cdn.mp3quran.net/audio/mahmoud-husary/r1/"
                : ea.id === 15
                ? "https://cdn.mp3quran.net/audio/mahmoud-husary/r2/"
                : `https://download.quranicaudio.com/quran/${ea.cdnPath}/`,
            surahTotal: 114,
            surahList: Array.from({ length: 114 }, (_, i) => i + 1),
          });
          existingIds.add(ea.id);
        }
      }

      if (parsed.length > 0) {
        cachedReciters = sortListenReciters(parsed);
        cacheTime = now;
        return NextResponse.json(
          { reciters: cachedReciters },
          {
            headers: {
              "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
            },
          }
        );
      }
    }
  } catch (e) {
    console.warn("[api/listen/reciters] Failed to fetch upstream mp3quran, using fallback:", e);
  }

  // Fallback with EveryAyah merged
  const fallbackList = [...FALLBACK_RECITERS];
  const fallbackIds = new Set(fallbackList.map((f) => f.id));
  for (const ea of EVERYAYAH_ADDITIONAL_RECITERS) {
    if (!fallbackIds.has(ea.id)) {
      fallbackList.push({
        id: ea.id,
        name: ea.name,
        nameArabic: ea.nameArabic,
        style: ea.style ? `Hafs A'n Assem - ${ea.style}` : "Hafs A'n Assem",
        server:
          ea.id === 14
            ? "https://cdn.mp3quran.net/audio/mahmoud-husary/r1/"
            : ea.id === 15
            ? "https://cdn.mp3quran.net/audio/mahmoud-husary/r2/"
            : `https://download.quranicaudio.com/quran/${ea.cdnPath}/`,
        surahTotal: 114,
        surahList: Array.from({ length: 114 }, (_, i) => i + 1),
      });
      fallbackIds.add(ea.id);
    }
  }

  return NextResponse.json(
    { reciters: sortListenReciters(fallbackList) },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
