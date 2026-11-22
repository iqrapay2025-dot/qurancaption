import { NextRequest } from "next/server";
import { createAyahOgImageResponse } from "@/lib/ayah-og";

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const surah = searchParams.get("surah") || searchParams.get("s") || "1";
  const ayah = searchParams.get("ayah") || searchParams.get("a") || "1";

  const response = await createAyahOgImageResponse(surah, ayah);
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"
  );
  return response;
}
