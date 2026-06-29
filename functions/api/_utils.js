// Shared helpers for Cloudflare Pages Functions.
// No external libraries — uses the Web Crypto API available natively in Workers.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function uuid() {
  return crypto.randomUUID();
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// PBKDF2 password hashing — built into Web Crypto, no extra dependency needed.
export async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const saltHexOut = saltHex || toHex(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );

  return { hash: toHex(derived), salt: saltHexOut };
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hash } = await hashPassword(password, saltHex);
  return hash === expectedHashHex;
}

const SESSION_COOKIE = "src_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

export function setSessionCookie(sessionId) {
  const secure = "Secure; "; // Cloudflare Pages always serves HTTPS
  return `${SESSION_COOKIE}=${sessionId}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function createSession(db, userId) {
  const id = uuid();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(id, userId, expiresAt)
    .run();
  return id;
}

// Looks up the current logged-in user from the session cookie.
// Returns null if not logged in or session expired.
export async function getCurrentUser(request, db) {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;

  const session = await db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first();
  if (!session || session.expires_at < Date.now()) return null;

  const user = await db
    .prepare("SELECT id, hospital_id, username, role, full_name FROM users WHERE id = ?")
    .bind(session.user_id)
    .first();
  return user || null;
}

export async function requireUser(request, db) {
  const user = await getCurrentUser(request, db);
  if (!user) throw new AuthError("Not logged in", 401);
  return user;
}

export async function requireAdmin(request, db) {
  const user = await requireUser(request, db);
  if (user.role !== "admin") throw new AuthError("Admin access required", 403);
  return user;
}

export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
