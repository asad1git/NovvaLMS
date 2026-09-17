import api from "./axios";

export function listPrograms() {
  return api.get("/programs").then((r) => r.data.data);
}

export function createProgram(payload) {
  return api.post("/programs", payload).then((r) => r.data.data);
}
