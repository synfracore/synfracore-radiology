import {
  json,
  uuid,
  hashPassword,
  requireSuperAdmin,
  normalizeAnswer,
  AuthError,
} from "../_utils.js";

// GET /api/superadmin/hospitals — list all hospitals + their admin
export async function onRequestGet({ request, env }) {
  try {
    await requireSuperAdmin(request, env.DB);
    const { results } = await env.DB.prepare(
      `SELECT h.id, h.name, h.created_at,
              u.username AS admin_username, u.full_name AS admin_full_name
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'admin'
       ORDER BY h.created_at DESC`
    ).all();
    return json({ hospitals: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}

// POST /api/superadmin/hospitals — create a hospital + its one admin account
export async function onRequestPost({ request, env }) {
  try {
    await requireSuperAdmin(request, env.DB);
    const {
      hospitalName,
      adminUsername,
      adminPassword,
      adminFullName,
      securityQuestion,
      securityAnswer,
    } = await request.json();

    if (!hospitalName || !adminUsername || !adminPassword || !adminFullName || !securityQuestion || !securityAnswer) {
      return json({ error: "All fields are required, including the security question." }, 400);
    }
    if (adminPassword.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?")
      .bind(adminUsername)
      .first();
    if (existing) {
      return json({ error: "That username is already taken." }, 409);
    }

    const hospitalId = uuid();
    const adminId = uuid();
    const now = Date.now();
    const { hash, salt } = await hashPassword(adminPassword);
    const { hash: answerHash, salt: answerSalt } = await hashPassword(normalizeAnswer(securityAnswer));

    await env.DB.prepare("INSERT INTO hospitals (id, name, created_at) VALUES (?, ?, ?)")
      .bind(hospitalId, hospitalName, now)
      .run();

    await env.DB.prepare(
      `INSERT INTO users
        (id, hospital_id, username, password_hash, salt, role, full_name,
         security_question, security_answer_hash, security_answer_salt, created_at)
       VALUES (?, ?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?)`
    )
      .bind(adminId, hospitalId, adminUsername, hash, salt, adminFullName, securityQuestion, answerHash, answerSalt, now)
      .run();

    return json({ hospitalId, adminId }, 201);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
