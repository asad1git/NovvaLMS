import api from "./axios";

export function listAdvisorLinks() {
  return api.get("/advisor-links").then((r) => r.data.data);
}

export function linkAdvisor(advisorId, studentId) {
  return api.post("/advisor-links", { advisorId, studentId }).then((r) => r.data.data);
}

export function unlinkAdvisor(id) {
  return api.delete(`/advisor-links/${id}`).then((r) => r.data.data);
}

export function getMyAdvisees() {
  return api.get("/advisor-links/my-advisees").then((r) => r.data.data);
}

export function getAdviseeTranscript(studentId) {
  return api.get(`/advisor-links/${studentId}/transcript`).then((r) => r.data.data);
}

export function getAdviseeRegistration(studentId) {
  return api.get(`/advisor-links/${studentId}/registration`).then((r) => r.data.data);
}
