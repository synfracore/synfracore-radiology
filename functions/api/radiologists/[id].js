import { json, requireAdmin, AuthError } from "../_utils.js";

// DELETE /api/radiologists/:id — admin removes a radiologist from their hospital
export async function onRequestDelete({ request, env, params }) {
  try {
    const admin = await requireAdmin(request, env.DB);
    const { id } = params;

    const target = await env.DB.prepare("SELECT * FROM users WHERE id = ? AND hospital_id = ?")
      .bind(id, admin.hospital_id)
      .first();
    if (!target || target.role !== "radiologist") {
      return json({ error: "Radiologist not found." }, 404);
    }

    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
