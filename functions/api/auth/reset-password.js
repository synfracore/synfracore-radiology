import { json, hashPassword, verifyPassword, normalizeAnswer } from "../_utils.js";

// POST /api/auth/reset-password  { username, securityAnswer, newPassword }
export async function onRequestPost({ request, env }) {
  const { username, securityAnswer, newPassword } = await request.json();

  if (!username || !securityAnswer || !newPassword) {
    return json({ error: "All fields are required." }, 400);
  }
  if (newPassword.length < 8) {
    return json({ error: "Password must be at least 8 characters." }, 400);
  }

  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  if (!user || !user.security_answer_hash) {
    return json({ error: "Unable to reset password for this account." }, 404);
  }

  const ok = await verifyPassword(normalizeAnswer(securityAnswer), user.security_answer_salt, user.security_answer_hash);
  if (!ok) {
    return json({ error: "That answer doesn't match our records." }, 401);
  }

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?")
    .bind(hash, salt, user.id)
    .run();

  return json({ ok: true });
}
