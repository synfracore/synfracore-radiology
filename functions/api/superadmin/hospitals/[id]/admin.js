import { json, uuid, hashPassword, requireSuperAdmin, normalizeAnswer, AuthError } from "../../../_utils.js";

// POST /api/superadmin/hospitals/:id/admin
// Creates an admin account for a hospital that has none (e.g. orphaned after
// a role change), or adds an additional admin login for that hospital.
export async function onRequestPost({ request, env, params }) {
  try {
    await requireSuperAdmin(request, env.DB);
    const hospitalId = params.id;

    const hospital = await env.DB.prepare("SELECT id, name FROM hospitals WHERE id = ?")
      .bind(hospitalId)
      .first();
    if (!hospital) return json({ error: "Hospital not found." }, 404);

    const { username, password, fullName, securityQuestion, securityAnswer } = await request.json();
    if (!username || !password || !fullName || !securityQuestion || !securityAnswer) {
      return json({ error: "All fields are required, including the security question." }, 400);
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
       VALUES (?, ?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?)`
    )
      .bind(id, hospitalId, username, hash, salt, fullName, securityQuestion, answerHash, answerSalt, now)
      .run();

    return json({ id, username, fullName }, 201);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
