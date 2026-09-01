import api from "./axios";

export function listUsers(role) {
  const query = role ? `?role=${role}` : "";
  return api.get(`/users${query}`).then((r) => r.data.data);
}

export function createUser(payload) {
  return api.post("/users", payload).then((r) => r.data.data);
}

export function updateUser(id, payload) {
  return api.put(`/users/${id}`, payload).then((r) => r.data.data);
}
