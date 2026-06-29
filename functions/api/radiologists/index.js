import { json, uuid, hashPassword, requireAdmin, normalizeAnswer, AuthError } from "../_utils.js";

// GET /api/radiologists — list radiologists in admin's hospital
export async function onRequestGet({ request, env }) {
  try {
    const admin = await requireAdmin(request, env.DB);
    const { results } = await env.DB.prepare(
      "SELECT id, username, full_name, created_at FROM users WHERE hospital_id = ? AND role = 'radiologist' ORDER BY created_at DESC"
    )
      .bind(admin.hospital_id)
      .all();
    return json({ radiologists: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}

// POST /api/radiologists  { username, password, fullName } — admin creates a radiologist account
export async function onRequestPost({ request, env }) {
  try {
    const admin = await requireAdmin(request, env.DB);
    const { username, password, fullName, securityQuestion, securityAnswer } = await request.json();

    if (!username || !password || !fullName || !securityQuestion || !securityAnswer) {
      return json({ error: "Username, password, full name, and security question are required." }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (existing) {
      return json({ error: "That username is already taken." }, 409);
    }

    const id = uuid();
    const now = Date.now();
    const { hash, salt } = await hashPassword(password);
    const { hash: answerHash, salt: answerSalt } = await hashPassword(normalizeAnswer(securityAnswer));

    await env.DB.prepare(
      `INSERT INTO users
        (id, hospital_id, username, password_hash, salt, role, full_name,
         security_question, security_answer_hash, security_answer_salt, created_at)
       VALUES (?, ?, ?, ?, ?, 'radiologist', ?, ?, ?, ?, ?)`
    )
      .bind(id, admin.hospital_id, username, hash, salt, fullName, securityQuestion, answerHash, answerSalt, now)
      .run();

    return json({ radiologist: { id, username, fullName, createdAt: now } }, 201);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
