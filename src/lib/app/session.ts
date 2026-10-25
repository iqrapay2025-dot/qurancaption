import "server-only";
import { cookies } from "next/headers";
import { getPayloadClient } from "@/lib/payload";
import type { User } from "@/payload-types";

export const SESSION_COOKIE = "app-session";
const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function setSession(token: string, exp?: number) {
  const maxAge = exp ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : 60 * 60 * 24 * 30;
  (await cookies()).set(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge });
}

export async function clearSession() {
  (await cookies()).set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) });
  if (!user || user.collection !== "users") return null;
  return user as User;
}

export function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name ?? null };
}
