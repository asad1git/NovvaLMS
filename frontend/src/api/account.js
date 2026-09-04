import api from "./axios";

export function getMe() {
  return api.get("/auth/me").then((r) => r.data.data);
}

export function updateProfile(name) {
  return api.put("/auth/me", { name }).then((r) => r.data.data);
}

export function changePassword(currentPassword, newPassword) {
  return api.put("/auth/me/password", { currentPassword, newPassword }).then((r) => r.data.data);
}
