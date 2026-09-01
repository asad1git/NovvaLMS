import api from "./axios";

export function listCourses() {
  return api.get("/courses").then((r) => r.data.data);
}

export function createCourse(payload) {
  return api.post("/courses", payload).then((r) => r.data.data);
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
