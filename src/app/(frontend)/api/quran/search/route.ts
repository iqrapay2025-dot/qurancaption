import { respond, searchQuran } from "@/lib/quran/server"

export const GET = (req: Request) => {
  const q = new URL(req.url).searchParams
  return respond(() => searchQuran(q.get("q") ?? "", q.get("translation") ?? undefined, Number(q.get("limit") ?? 25)))
}
