import { csrf, ok } from "@/lib/app/http";
import { clearSession } from "@/lib/app/session";

export async function POST(req: Request) {
  const bad = csrf(req); if (bad) return bad;
  await clearSession();
  return ok();
}
