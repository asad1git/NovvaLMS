import api from "./axios";

export function listDepartments() {
  return api.get("/departments").then((r) => r.data.data);
}

export function createDepartment(payload) {
  return api.post("/departments", payload).then((r) => r.data.data);
}

export function getDepartmentReport(departmentId) {
  return api.get(`/departments/${departmentId}/report`).then((r) => r.data.data);
}
