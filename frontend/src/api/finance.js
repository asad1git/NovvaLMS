import api from "./axios";

async function downloadBlob(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const objectUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function listStudents() {
  return api.get("/users?role=student").then((r) => r.data.data);
}

export function listFeeChallans() {
  return api.get("/fee-challans").then((r) => r.data.data);
}

export function createFeeChallan(payload) {
  return api.post("/fee-challans", payload).then((r) => r.data.data);
}

export function setFeeChallanStatus(id, status) {
  return api.put(`/fee-challans/${id}/status`, { status }).then((r) => r.data.data);
}

export function downloadFeeChallanPdf(id, challanNumber) {
  return downloadBlob(`/fee-challans/${id}/pdf`, `${challanNumber}.pdf`);
}

export function listSalarySlips() {
  return api.get("/salary-slips").then((r) => r.data.data);
}

export function createSalarySlip(payload) {
  return api.post("/salary-slips", payload).then((r) => r.data.data);
}

export function downloadSalarySlipPdf(id, employeeName, month) {
  return downloadBlob(`/salary-slips/${id}/pdf`, `salary-slip-${employeeName}-${month}.pdf`);
}
