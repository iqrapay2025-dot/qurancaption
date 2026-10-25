import { getTranslations, respond } from "@/lib/quran/server"

export const GET = () => respond(getTranslations, true)
