import api from "./axios";

export function getMessages(courseId) {
  return api.get(`/courses/${courseId}/chat/messages`).then((r) => r.data.data);
}

export function sendMessage(courseId, content) {
  return api.post(`/courses/${courseId}/chat/messages`, { content }).then((r) => r.data.data);
}
