import api from "./axios";

export function createSession(courseId, date, topic) {
  return api.post(`/courses/${courseId}/attendance`, { date, topic }).then((r) => r.data.data);
}

export function listSessions(courseId) {
  return api.get(`/courses/${courseId}/attendance`).then((r) => r.data.data);
}

export function getSessionDetail(sessionId) {
  return api.get(`/attendance/sessions/${sessionId}`).then((r) => r.data.data);
}

export function updateSessionRecords(sessionId, records) {
  return api.put(`/attendance/sessions/${sessionId}`, { records }).then((r) => r.data.data);
}
