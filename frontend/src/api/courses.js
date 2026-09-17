import api from "./axios";

// Role-scoped list of CourseOfferings, flattened server-side into the same
// shape a plain Course used to have (title/code/teacher directly on the
// object) — see backend/controllers/offeringController.js#flattenOffering.
// Every existing caller of this function keeps working unchanged.
export function listCourses() {
  return api.get("/courses").then((r) => r.data.data);
}

// Creates a CATALOG course only (title/code/description) — no teacher, no
// term. Assigning a teacher+term to it is the separate createOffering call.
export function createCourse(payload) {
  return api.post("/courses", payload).then((r) => r.data.data);
}

// The plain catalog (admin only) — used by the "which catalog course is
// this an offering of" dropdown. Not the same as listCourses() above.
export function listCatalogCourses() {
  return api.get("/courses/catalog").then((r) => r.data.data);
}

export function listTerms() {
  return api.get("/terms").then((r) => r.data.data);
}

export function createTerm(payload) {
  return api.post("/terms", payload).then((r) => r.data.data);
}

// Assigns a catalog course to a term with a teacher — the actual
// "who teaches what, when" fact. Returns the same flattened shape as
// listCourses()'s entries.
export function createOffering(payload) {
  return api.post("/offerings", payload).then((r) => r.data.data);
}

export function getEnrollments(courseId) {
  return api.get(`/courses/${courseId}/enrollments`).then((r) => r.data.data);
}

export function bulkEnrollCSV(courseId, file) {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/courses/${courseId}/enroll/csv`, form).then((r) => r.data.data);
}

export function getMaterials(courseId) {
  return api.get(`/courses/${courseId}/materials`).then((r) => r.data.data);
}

export function uploadMaterial(courseId, file, title) {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  return api.post(`/courses/${courseId}/materials`, form).then((r) => r.data.data);
}

export function replaceMaterial(materialId, file) {
  const form = new FormData();
  form.append("file", file);
  return api.put(`/materials/${materialId}/replace`, form).then((r) => r.data.data);
}

export function deleteMaterial(materialId) {
  return api.delete(`/materials/${materialId}`).then((r) => r.data.data);
}

// JWT auth is header-based (no cookies), so a plain <a href> download can't
// carry the token — fetch the file as a blob and hand the browser a local
// object URL to save instead.
export async function downloadMaterial(materialId, fileName) {
  const res = await api.get(`/materials/${materialId}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function listTeachers() {
  return api.get("/users?role=teacher").then((r) => r.data.data);
}

export function getOfferingGrades(offeringId) {
  return api.get(`/courses/${offeringId}/grades`).then((r) => r.data.data);
}

export function finalizeGrade(offeringId, studentId, percentage) {
  return api.put(`/courses/${offeringId}/grades/${studentId}`, { percentage }).then((r) => r.data.data);
}
