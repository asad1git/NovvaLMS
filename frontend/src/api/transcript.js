import api from "./axios";

export function getMyTranscript() {
  return api.get("/transcript/me").then((r) => r.data.data);
}
