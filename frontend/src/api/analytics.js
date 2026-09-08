import api from "./axios";

export function getMyAnalytics(courseId) {
  return api.get("/analytics/me", { params: courseId ? { courseId } : {} }).then((r) => r.data.data);
}
