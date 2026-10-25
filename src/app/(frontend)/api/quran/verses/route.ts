import { getVerses, respond } from "@/lib/quran/server"

export const GET = (req: Request) => {
  const q = new URL(req.url).searchParams
  const keys = (q.get("translations") ?? "").split(",").filter((k) => /^[a-z_]{2,40}$/.test(k))
  return respond(() => getVerses(Number(q.get("surah")), Number(q.get("from")), Number(q.get("to")), keys, q.get("tajweed") === "1"))
}
