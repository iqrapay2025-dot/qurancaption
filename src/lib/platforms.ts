export type Ratio = "9:16" | "16:9" | "1:1";
export type PlatformId = "tiktok" | "reels" | "shorts" | "youtube" | "square";

// Margins are percentages of the canvas. They are approximate: platforms change their interface, so treat them as a guide.
export type Platform = {
  id: PlatformId; name: string; ratio: Ratio; note: string;
  safe: { top: number; right: number; bottom: number; left: number };
  pos: "top" | "middle" | "bottom"; arSize: number; trSize: number;
};

export const PLATFORMS: Platform[] = [
  { id: "tiktok", name: "TikTok", ratio: "9:16", note: "Keeps clear of the caption, buttons and username at the bottom and right.", safe: { top: 9, right: 13, bottom: 24, left: 6 }, pos: "middle", arSize: 78, trSize: 40 },
  { id: "reels", name: "Instagram Reels", ratio: "9:16", note: "Keeps clear of the top bar, the right-hand buttons and the caption area.", safe: { top: 12, right: 12, bottom: 22, left: 6 }, pos: "middle", arSize: 76, trSize: 38 },
  { id: "shorts", name: "YouTube Shorts", ratio: "9:16", note: "Keeps clear of the title, channel row and right-hand buttons.", safe: { top: 8, right: 14, bottom: 20, left: 6 }, pos: "middle", arSize: 76, trSize: 38 },
  { id: "youtube", name: "YouTube (16:9)", ratio: "16:9", note: "Keeps clear of the player controls and title-safe edges.", safe: { top: 6, right: 6, bottom: 12, left: 6 }, pos: "bottom", arSize: 100, trSize: 50 },
  { id: "square", name: "Instagram Square", ratio: "1:1", note: "Leaves room for the feed crop and caption overlay.", safe: { top: 8, right: 8, bottom: 12, left: 8 }, pos: "middle", arSize: 72, trSize: 36 },
];

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id);
export const platformById = (id: string | null | undefined) => PLATFORMS.find((p) => p.id === id);
