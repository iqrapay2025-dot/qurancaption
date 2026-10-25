import { getChapters, respond } from "@/lib/quran/server"

export const GET = () => respond(getChapters, true)
