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

export function listHospitals() {
  return request("/superadmin/hospitals").then((d) => d.hospitals);
}

export function createHospital(payload) {
  return request("/superadmin/hospitals", { method: "POST", body: JSON.stringify(payload) });
}

export function addHospitalAdmin(hospitalId, payload) {
  return request(`/superadmin/hospitals/${hospitalId}/admin`, { method: "POST", body: JSON.stringify(payload) });
}

export function forgotPassword(username) {
  return request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ username }) });
}

export function resetPassword({ username, securityAnswer, newPassword }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ username, securityAnswer, newPassword }),
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

export function createRadiologist({ username, password, fullName, securityQuestion, securityAnswer }) {
  return request("/radiologists", {
    method: "POST",
    body: JSON.stringify({ username, password, fullName, securityQuestion, securityAnswer }),
  });
}

export function deleteRadiologist(id) {
  return request(`/radiologists/${id}`, { method: "DELETE" });
}

export function getHospitalInfo() {
  return request("/hospital").then((d) => d.hospital);
}

export function updateHospitalInfo({ address, phone, logoData }) {
  return request("/hospital", {
    method: "PUT",
    body: JSON.stringify({ address, phone, logoData }),
  }).then((d) => d.hospital);
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

// learnFromApprovedReport({ modality, bodyPart, sections }) — fire-and-forget
// call made right after a report is approved, so the D1-backed phrase
// learner (functions/api/patterns/index.js) can improve its suggestions
// over time.
export function learnFromApprovedReport(payload) {
  return request("/patterns/learn", { method: "POST", body: JSON.stringify(payload) });
}

// getPhraseSuggestions(modality, bodyPart, section, partial) -> Promise<{phrase, count}[]>
export function getPhraseSuggestions(modality, bodyPart, section, partial) {
  const params = new URLSearchParams({ modality, bodyPart, section, partial });
  return request(`/patterns/suggest?${params.toString()}`).then((d) => d.suggestions);
}
