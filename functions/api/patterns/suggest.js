import { json, requireUser, AuthError } from "../_utils.js";

// GET /api/patterns/suggest?modality=CT&bodyPart=Brain&section=findings&partial=no+acute
// Returns the top 5 learned phrases for that modality/bodyPart/section
// whose text starts with or contains the partial text typed so far,
// ranked by how often they've been learned (most-approved first).
export async function onRequestGet({ request, env }) {
  try {
    await requireUser(request, env.DB);
    const url = new URL(request.url);
    const modality = (url.searchParams.get("modality") || "").trim();
    const bodyPart = (url.searchParams.get("bodyPart") || "").trim();
    const section = (url.searchParams.get("section") || "").trim();
    const partial = (url.searchParams.get("partial") || "").trim().toLowerCase();

    if (!modality || !bodyPart || !section) {
      return json({ error: "modality, bodyPart, and section are required." }, 400);
    }

    const startsWithParam = `${partial}%`;
    const containsParam = `%${partial}%`;

    const { results } = await env.DB.prepare(
      `SELECT phrase, count FROM learned_phrases
       WHERE modality = ? AND body_part = ? AND section = ?
         AND (phrase LIKE ? OR phrase LIKE ?)
       ORDER BY count DESC
       LIMIT 5`
    )
      .bind(modality, bodyPart, section, startsWithParam, containsParam)
      .all();

    return json({ suggestions: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
