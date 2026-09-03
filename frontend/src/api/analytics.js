import api from "./axios";

export function getMyAnalytics() {
  return api.get("/analytics/me").then((r) => r.data.data);
}
