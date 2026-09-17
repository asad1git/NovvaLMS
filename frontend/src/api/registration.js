import api from "./axios";

export function getRegistrationOfferings(termId) {
  const query = termId ? `?termId=${termId}` : "";
  return api.get(`/registration/offerings${query}`).then((r) => r.data.data);
}

export function registerForOffering(offeringId) {
  return api.post(`/registration/offerings/${offeringId}`).then((r) => r.data.data);
}

export function dropOffering(offeringId) {
  return api.delete(`/registration/offerings/${offeringId}`).then((r) => r.data.data);
}
