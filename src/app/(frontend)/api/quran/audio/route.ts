import { getAudio, respond } from "@/lib/quran/server"

export const GET = (req: Request) => {
  const q = new URL(req.url).searchParams
  return respond(() => getAudio(Number(q.get("surah")), Number(q.get("reciter"))))
}
