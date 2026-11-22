// Re-export the GET handler from /api/verify
// This allows both /api/verify?token=... and /verify?token=... to work directly.
export { GET } from "../api/verify/route";
