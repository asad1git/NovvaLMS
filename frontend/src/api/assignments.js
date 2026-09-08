import api from "./axios";

export function listAssignments(courseId) {
  return api.get(`/courses/${courseId}/assignments`).then((r) => r.data.data);
}

export function createAssignment(courseId, { title, description, dueDate, maxScore, file }) {
  const form = new FormData();
  form.append("title", title);
  form.append("description", description || "");
  form.append("dueDate", dueDate);
  form.append("maxScore", maxScore);
  form.append("file", file);
  return api.post(`/courses/${courseId}/assignments`, form).then((r) => r.data.data);
}

// JWT auth is header-based (no cookies), so a plain <a href> download can't
// carry the token — fetch the file as a blob and hand the browser a local
// object URL to save instead (same pattern as api/courses.js#downloadMaterial).
async function downloadBlob(url, fileName) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export function downloadAssignmentFile(assignmentId, fileName) {
  return downloadBlob(`/assignments/${assignmentId}/download`, fileName);
}

export function submitAssignment(assignmentId, file) {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/assignments/${assignmentId}/submit`, form).then((r) => r.data.data);
}

export function getSubmissionsForAssignment(assignmentId) {
  return api.get(`/assignments/${assignmentId}/submissions`).then((r) => r.data.data);
}

export function downloadSubmissionFile(submissionId, fileName) {
  return downloadBlob(`/assignments/submissions/${submissionId}/download`, fileName);
}

export function gradeSubmission(submissionId, score, feedback) {
  return api.put(`/assignments/submissions/${submissionId}`, { score, feedback }).then((r) => r.data.data);
}
