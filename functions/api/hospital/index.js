import { json, requireUser, requireAdmin, AuthError } from "../_utils.js";

// GET /api/hospital — returns the current user's own hospital letterhead
// info (name, address, phone, logo). Any logged-in hospital user can read
// it (radiologists need it to render report letterheads); superadmin has no
// hospital_id and gets { hospital: null }.
export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env.DB);
    if (!user.hospital_id) return json({ hospital: null });

    const hospital = await env.DB.prepare(
      "SELECT id, name, address, phone, logo_data FROM hospitals WHERE id = ?"
    )
      .bind(user.hospital_id)
      .first();

    return json({ hospital: hospital || null });
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    return json({ error: "Server error" }, 500);
  }
}

// PUT /api/hospital — updates the current hospital admin's own hospital
// letterhead info (address, phone, logo). Admin-only; superadmin has no
// hospital_id to update.
export async function onRequestPut({ request, env }) {
  try {
    const user = await requireAdmin(request, env.DB);
    if (!user.hospital_id) {
      return json({ error: "No hospital is associated with this account." }, 400);
    }

    const body = await request.json();
    const address = (body.address || "").trim();
    const phone = (body.phone || "").trim();
    const logoData = body.logoData || null;

    await env.DB.prepare("UPDATE hospitals SET address = ?, phone = ?, logo_data = ? WHERE id = ?")
      .bind(address, phone, logoData, user.hospital_id)
      .run();

    const hospital = await env.DB.prepare(
      "SELECT id, name, address, phone, logo_data FROM hospitals WHERE id = ?"
    )
      .bind(user.hospital_id)
      .first();

    return json({ hospital });
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    return json({ error: "Server error" }, 500);
  }
}
