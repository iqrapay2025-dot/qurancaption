import { getReciters, respond } from "@/lib/quran/server"

export const GET = () => respond(getReciters, true)
