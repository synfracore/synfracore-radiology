import { json, requireUser, AuthError } from "../_utils.js";

async function getScopedReport(env, id, hospitalId) {
  return env.DB.prepare("SELECT * FROM reports WHERE id = ? AND hospital_id = ?")
    .bind(id, hospitalId)
    .first();
}

// GET /api/reports/:id
export async function onRequestGet({ request, env, params }) {
  try {
    const user = await requireUser(request, env.DB);
    const report = await getScopedReport(env, params.id, user.hospital_id);
    if (!report) return json({ error: "Report not found." }, 404);
    return json({ report });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}

// PUT /api/reports/:id — update draft text / fields, or approve with signature.
// Once a report is Approved, it becomes locked: no further edits are accepted.
export async function onRequestPut({ request, env, params }) {
  try {
    const user = await requireUser(request, env.DB);
    const existing = await getScopedReport(env, params.id, user.hospital_id);
    if (!existing) return json({ error: "Report not found." }, 404);

    if (existing.status === "Approved") {
      return json({ error: "This report is approved and locked. It can no longer be edited." }, 403);
    }

    const body = await request.json();
    const now = Date.now();
    const isApproving = body.status === "Approved";

    if (isApproving && !body.signatureData) {
      return json({ error: "A digital signature is required to approve a report." }, 400);
    }

    await env.DB.prepare(
      `UPDATE reports SET
        patient_id = ?, patient_name = ?, patient_age = ?, patient_gender = ?,
        modality = ?, study = ?, clinical_history = ?, dictated_text = ?,
        draft_text = ?, status = ?, signature_data = ?, approved_by = ?, approved_at = ?,
        updated_at = ?
       WHERE id = ? AND hospital_id = ?`
    )
      .bind(
        body.patient?.id ?? existing.patient_id,
        body.patient?.name ?? existing.patient_name,
        body.patient?.age ?? existing.patient_age,
        body.patient?.gender ?? existing.patient_gender,
        body.modality ?? existing.modality,
        body.study ?? existing.study,
        body.clinicalHistory ?? existing.clinical_history,
        body.dictatedText ?? existing.dictated_text,
        body.draftText ?? existing.draft_text,
        body.status ?? existing.status,
        isApproving ? body.signatureData : existing.signature_data,
        isApproving ? user.id : existing.approved_by,
        isApproving ? now : existing.approved_at,
        now,
        params.id,
        user.hospital_id
      )
      .run();

    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}

// DELETE /api/reports/:id
export async function onRequestDelete({ request, env, params }) {
  try {
    const user = await requireUser(request, env.DB);
    const existing = await getScopedReport(env, params.id, user.hospital_id);
    if (!existing) return json({ error: "Report not found." }, 404);
    if (existing.status === "Approved") {
      return json({ error: "Approved reports cannot be deleted." }, 403);
    }

    await env.DB.prepare("DELETE FROM reports WHERE id = ? AND hospital_id = ?")
      .bind(params.id, user.hospital_id)
      .run();

    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
