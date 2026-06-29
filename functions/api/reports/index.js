import { json, uuid, requireUser, AuthError } from "../_utils.js";

// GET /api/reports — all reports for the logged-in user's hospital
export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env.DB);
    const { results } = await env.DB.prepare(
      "SELECT * FROM reports WHERE hospital_id = ? ORDER BY updated_at DESC"
    )
      .bind(user.hospital_id)
      .all();
    return json({ reports: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}

// POST /api/reports — create a new report (draft)
export async function onRequestPost({ request, env }) {
  try {
    const user = await requireUser(request, env.DB);
    const body = await request.json();
    const id = uuid();
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO reports
        (id, hospital_id, created_by, patient_id, patient_name, patient_age, patient_gender,
         modality, study, clinical_history, dictated_text, draft_text, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        user.hospital_id,
        user.id,
        body.patient?.id || "",
        body.patient?.name || "",
        body.patient?.age || "",
        body.patient?.gender || "",
        body.modality || "",
        body.study || "",
        body.clinicalHistory || "",
        body.dictatedText || "",
        body.draftText || "",
        body.status || "Draft",
        now,
        now
      )
      .run();

    return json({ id }, 201);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
