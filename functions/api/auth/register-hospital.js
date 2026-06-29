import { json, uuid, hashPassword, createSession, setSessionCookie } from "../_utils.js";

// POST /api/auth/register-hospital
// Creates a new hospital + its one admin account. Call this once per hospital.
export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const body = await request.json();
  const { hospitalName, adminUsername, adminPassword, adminFullName } = body;

  if (!hospitalName || !adminUsername || !adminPassword || !adminFullName) {
    return json({ error: "All fields are required." }, 400);
  }
  if (adminPassword.length < 8) {
    return json({ error: "Password must be at least 8 characters." }, 400);
  }

  const existing = await db
    .prepare("SELECT id FROM users WHERE username = ?")
    .bind(adminUsername)
    .first();
  if (existing) {
    return json({ error: "That username is already taken." }, 409);
  }

  const hospitalId = uuid();
  const adminId = uuid();
  const now = Date.now();
  const { hash, salt } = await hashPassword(adminPassword);

  await db
    .prepare("INSERT INTO hospitals (id, name, created_at) VALUES (?, ?, ?)")
    .bind(hospitalId, hospitalName, now)
    .run();

  await db
    .prepare(
      "INSERT INTO users (id, hospital_id, username, password_hash, salt, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)"
    )
    .bind(adminId, hospitalId, adminUsername, hash, salt, adminFullName, now)
    .run();

  const sessionId = await createSession(db, adminId);

  return new Response(
    JSON.stringify({
      user: { id: adminId, hospitalId, username: adminUsername, role: "admin", fullName: adminFullName },
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json", "Set-Cookie": setSessionCookie(sessionId) },
    }
  );
}
