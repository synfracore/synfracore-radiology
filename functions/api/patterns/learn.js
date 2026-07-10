import { json, uuid, requireUser, AuthError } from "../_utils.js";

const SECTION_KEYS = ["findings", "impression", "technique"];

// upsertPhrase(db, modality, bodyPart, section, phrase, now)
// Relies on the unique index over (modality, body_part, section, phrase)
// (see schema.sql / migrate_v5.sql) to atomically increment an existing
// row's count or insert a fresh one with count = 1.
async function upsertPhrase(db, modality, bodyPart, section, phrase, now) {
  await db
    .prepare(
      `INSERT INTO learned_phrases (id, modality, body_part, section, phrase, count, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(modality, body_part, section, phrase)
       DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`
    )
    .bind(uuid(), modality, bodyPart, section, phrase, now)
    .run();
}

// POST /api/patterns/learn — called when a report is approved (that's the
// point its content is trusted as ground truth). Upserts every normalized
// sentence from each section into learned_phrases so suggestions improve
// over time. Any logged-in user may trigger this (it's a side effect of
// their own approval action, not privileged data access).
export async function onRequestPost({ request, env }) {
  try {
    await requireUser(request, env.DB);
    const body = await request.json();
    const modality = String(body.modality || "").trim();
    const bodyPart = String(body.bodyPart || "").trim();
    const sections = body.sections || {};

    if (!modality || !bodyPart) {
      return json({ error: "modality and bodyPart are required." }, 400);
    }

    const now = Date.now();
    let learned = 0;
    for (const section of SECTION_KEYS) {
      const phrases = Array.isArray(sections[section]) ? sections[section] : [];
      for (const raw of phrases) {
        const phrase = String(raw || "").trim();
        if (!phrase) continue;
        await upsertPhrase(env.DB, modality, bodyPart, section, phrase, now);
        learned++;
      }
    }

    return json({ ok: true, learned });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: "Server error" }, 500);
  }
}
