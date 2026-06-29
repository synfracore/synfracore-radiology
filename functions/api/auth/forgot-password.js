import { json } from "../_utils.js";

// POST /api/auth/forgot-password  { username }
// Returns the security question for that username, if one exists.
// Deliberately returns a generic response either way so usernames can't be enumerated.
export async function onRequestPost({ request, env }) {
  const { username } = await request.json();
  if (!username) return json({ error: "Username is required." }, 400);

  const user = await env.DB.prepare("SELECT security_question FROM users WHERE username = ?")
    .bind(username)
    .first();

  if (!user || !user.security_question) {
    return json({ error: "No account found with that username, or no security question is set." }, 404);
  }

  return json({ securityQuestion: user.security_question });
}
