import { getCookie, clearSessionCookie } from "../_utils.js";

// POST /api/auth/logout
export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const sessionId = getCookie(request, "src_session");
  if (sessionId) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() },
  });
}
