// API client — talks to the Cloudflare Pages Functions backend (D1-backed).
// Cookies (httpOnly session) are sent automatically via credentials: "include".

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

export function registerHospital({ hospitalName, adminUsername, adminPassword, adminFullName, signupCode }) {
  return request("/auth/register-hospital", {
    method: "POST",
    body: JSON.stringify({ hospitalName, adminUsername, adminPassword, adminFullName, signupCode }),
  });
}

export function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

export function getSession() {
  return request("/auth/me").then((d) => d.user);
}

export function listRadiologists() {
  return request("/radiologists").then((d) => d.radiologists);
}

export function createRadiologist({ username, password, fullName }) {
  return request("/radiologists", {
    method: "POST",
    body: JSON.stringify({ username, password, fullName }),
  });
}

export function deleteRadiologist(id) {
  return request(`/radiologists/${id}`, { method: "DELETE" });
}

export function listReports() {
  return request("/reports").then((d) => d.reports);
}

export function getReport(id) {
  return request(`/reports/${id}`).then((d) => d.report);
}

export function createReport(payload) {
  return request("/reports", { method: "POST", body: JSON.stringify(payload) });
}

export function updateReport(id, payload) {
  return request(`/reports/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteReport(id) {
  return request(`/reports/${id}`, { method: "DELETE" });
}
