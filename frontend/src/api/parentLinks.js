import api from "./axios";

export function listParentLinks() {
  return api.get("/parent-links").then((r) => r.data.data);
}

export function linkParent(parentId, studentId) {
  return api.post("/parent-links", { parentId, studentId }).then((r) => r.data.data);
}

export function unlinkParent(id) {
  return api.delete(`/parent-links/${id}`).then((r) => r.data.data);
}

export function getMyChildren() {
  return api.get("/parent-links/my-children").then((r) => r.data.data);
}

export function getChildAnalytics(studentId) {
  return api.get(`/parent-links/${studentId}/analytics`).then((r) => r.data.data);
}
