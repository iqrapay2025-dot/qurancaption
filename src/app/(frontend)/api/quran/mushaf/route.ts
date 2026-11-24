import { NextRequest, NextResponse } from "next/server";
import { fetchMushafPage } from "@/lib/mushaf/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const page = parseInt(pageParam || "1", 10);

    if (isNaN(page) || page < 1 || page > 604) {
      return NextResponse.json(
        { error: "Page must be an integer between 1 and 604" },
        { status: 400 }
      );
    }

    const data = await fetchMushafPage(page);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("API /api/quran/mushaf error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load Mushaf page" },
      { status: 500 }
    );
  }
}
