import api from "./axios";

export function forgotPassword(email) {
  return api.post("/auth/forgot-password", { email }).then((r) => r.data.data);
}

export function resetPassword(token, newPassword) {
  return api.post("/auth/reset-password", { token, newPassword }).then((r) => r.data.data);
}
