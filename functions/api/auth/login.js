import { verifyPassword, createSession, setSessionCookie } from "../_utils.js";

// POST /api/auth/login  { username, password }
export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const { username, password } = await request.json();

  if (!username || !password) {
    return new Response(JSON.stringify({ error: "Username and password required." }), { status: 400 });
  }

  const user = await db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid username or password." }), { status: 401 });
  }

  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Invalid username or password." }), { status: 401 });
  }

  const sessionId = await createSession(db, user.id);

  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        hospitalId: user.hospital_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": setSessionCookie(sessionId) } }
  );
}
