import api from "./axios";

export function getMyDegreeAudit() {
  return api.get("/degree-audit/me").then((r) => r.data.data);
}
