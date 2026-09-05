import api from "./axios";

export function listNotifications() {
  return api.get("/notifications").then((r) => r.data.data);
}

export function markAsRead(id) {
  return api.put(`/notifications/${id}/read`).then((r) => r.data.data);
}

export function markAllAsRead() {
  return api.put("/notifications/read-all").then((r) => r.data.data);
}
