import apiClient from "./client";

export const authApi = {
  login: (data) => apiClient.post("/auth/login", data),
  register: (data) => apiClient.post("/auth/register", data),
  listUsers: (role) => apiClient.get("/auth/users", { params: { role } }),
  removeUser: (id) => apiClient.delete(`/auth/users/${id}`),
  me: () => apiClient.get("/auth/me"),
  changePassword: (data) => apiClient.put("/auth/change-password", data),
  verifyPassword: (data) => apiClient.post("/auth/verify-password", data),
  forgotPassword: (data) => apiClient.post("/auth/forgot-password", data),
};

export const machineApi = {
  list: (params) => apiClient.get("/machines", { params }),
  companies: () => apiClient.get("/machines/companies"),
  companyLayout: (company) => apiClient.get("/machines/company-layout", { params: { company } }),
  saveCompanyLayout: (data) => apiClient.put("/machines/company-layout", data),
  getById: (id) => apiClient.get(`/machines/${id}`),
  create: (data) => apiClient.post("/machines", data),
  update: (id, data) => apiClient.put(`/machines/${id}`, data),
  updateLayout: (id, data) => apiClient.patch(`/machines/${id}/layout`, data),
  updateStatus: (id, status) => apiClient.patch(`/machines/${id}/status`, { status }),
  remove: (id) => apiClient.delete(`/machines/${id}`),
  assign: (id, employeeIds) => apiClient.post(`/machines/${id}/assign`, { employeeIds }),
  addDocuments: (id, documents) => apiClient.post(`/machines/${id}/documents`, { documents }),
  removeDocument: (id, url) => apiClient.delete(`/machines/${id}/documents`, { data: { url } }),
};

export const employeeApi = {
  list: (params) => apiClient.get("/employees", { params }),
  getById: (id) => apiClient.get(`/employees/${id}`),
  create: (data) => apiClient.post("/employees", data),
  update: (id, data) => apiClient.put(`/employees/${id}`, data),
  remove: (id) => apiClient.delete(`/employees/${id}`),
};

export const oilChangeApi = {
  list: (params) => apiClient.get("/oil-changes", { params }),
  create: (data) => apiClient.post("/oil-changes", data),
  update: (id, data) => apiClient.put(`/oil-changes/${id}`, data),
  remove: (id) => apiClient.delete(`/oil-changes/${id}`),
};

export const maintenanceApi = {
  list: (params) => apiClient.get("/maintenance", { params }),
  create: (data) => apiClient.post("/maintenance", data),
  update: (id, data) => apiClient.put(`/maintenance/${id}`, data),
  remove: (id) => apiClient.delete(`/maintenance/${id}`),
};

export const sparePartApi = {
  list: (params) => apiClient.get("/spare-parts", { params }),
  create: (data) => apiClient.post("/spare-parts", data),
  update: (id, data) => apiClient.put(`/spare-parts/${id}`, data),
  remove: (id) => apiClient.delete(`/spare-parts/${id}`),
};

export const maintenanceJobApi = {
  list: (params) => apiClient.get("/maintenance-jobs", { params }),
  create: (data) => apiClient.post("/maintenance-jobs", data),
  update: (id, data) => apiClient.put(`/maintenance-jobs/${id}`, data),
  remove: (id) => apiClient.delete(`/maintenance-jobs/${id}`),
};

export const notificationApi = {
  list: (params) => apiClient.get("/notifications", { params }),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
};

export const dashboardApi = {
  getStats: () => apiClient.get("/dashboard"),
};

export const uploadApi = {
  single: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const compressorMaintenanceApi = {
  list: (params) => apiClient.get("/compressor-maintenance", { params }),
  schedule: (machine) =>
    apiClient.get("/compressor-maintenance/schedule", { params: { machine } }),
  create: (data) => apiClient.post("/compressor-maintenance", data),
  getById: (id) => apiClient.get(`/compressor-maintenance/${id}`),
  update: (id, data) => apiClient.put(`/compressor-maintenance/${id}`, data),
  remove: (id) => apiClient.delete(`/compressor-maintenance/${id}`),
};

export const airDryerMaintenanceApi = {
  list: (params) => apiClient.get("/air-dryer-maintenance", { params }),
  schedule: (machine) =>
    apiClient.get("/air-dryer-maintenance/schedule", { params: { machine } }),
  create: (data) => apiClient.post("/air-dryer-maintenance", data),
  getById: (id) => apiClient.get(`/air-dryer-maintenance/${id}`),
  update: (id, data) => apiClient.put(`/air-dryer-maintenance/${id}`, data),
  remove: (id) => apiClient.delete(`/air-dryer-maintenance/${id}`),
};
