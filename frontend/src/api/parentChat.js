import api from "./axios";

export function getMessages(studentId) {
  return api.get(`/parent-links/${studentId}/chat/messages`).then((r) => r.data.data);
}

export function sendMessage(studentId, content) {
  return api.post(`/parent-links/${studentId}/chat/messages`, { content }).then((r) => r.data.data);
}
