import { createAyahOgImageResponse, OG_IMAGE_SIZE } from "@/lib/ayah-og";

export const alt = "Aayah Studio — Holy Quran Ayah";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ surah: string; ayah: string }>;
}) {
  const { surah, ayah } = await params;
  return createAyahOgImageResponse(surah, ayah);
}
