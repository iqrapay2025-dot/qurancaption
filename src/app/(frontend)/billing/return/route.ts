export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const provider = q.get("provider") === "stripe" ? "stripe" : "paystack";
  const ref = q.get("reference") || q.get("trxref") || q.get("session_id") || "";
  const hash = q.get("canceled") ? "#/pricing" : `#/settings?provider=${provider}&ref=${encodeURIComponent(ref)}`;
  return new Response(null, { status: 302, headers: { Location: `/${hash}` } });
}
