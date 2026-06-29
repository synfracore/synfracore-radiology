import { getCurrentUser, json } from "../_utils.js";

// GET /api/auth/me — returns current logged-in user or null
export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env.DB);
  return json({ user });
}
