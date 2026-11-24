import api from "../../../services/api";
export const ragApi = {
  status: () => api.get("/admin/rag/status").then((r) => r.data),
  gaps: (params) =>
    api
      .get("/admin/rag/gaps", { params, notifyOnError: false })
      .then((r) => r.data),
  reembed: (component) =>
    api
      .post("/admin/rag/reembed", component ? { component } : {}, {
        notifyOnError: false,
      })
      .then((r) => r.data),
};
