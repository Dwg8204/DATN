import api from "../../../services/api";
const options = { notifyOnError: false };
export const topicsApi = {
  topics: (params) =>
    api
      .get("/admin/learning-topics", { ...options, params })
      .then((r) => r.data),
  remove: (id) =>
    api.delete(`/admin/learning-topics/${id}`, options).then((r) => r.data),
  save: (id, body) =>
    (id
      ? api.patch(`/admin/learning-topics/${id}`, body, options)
      : api.post("/admin/learning-topics", body, options)
    ).then((r) => r.data),
  tests: (params) =>
    api
      .get("/admin/topic-labels/tests", { ...options, params })
      .then((r) => r.data),
  labels: (params) =>
    api.get("/admin/topic-labels", { ...options, params }).then((r) => r.data),
  review: (items) =>
    api
      .post("/admin/topic-labels/review", { items }, options)
      .then((r) => r.data),
  approvalPreview: (id) =>
    api.get(`/admin/tests/${id}/topic-approval`, options).then((r) => r.data),
  approveTest: (id, revision) =>
    api
      .post(`/admin/tests/${id}/approve-topics`, { revision }, options)
      .then((r) => r.data),
  suggest: (id) =>
    api
      .post(`/admin/tests/${id}/suggest-topics`, {}, options)
      .then((r) => r.data),
  suggestMissing: (body) =>
    api
      .post("/admin/topic-labels/suggest-missing", body, options)
      .then((r) => r.data),
  progress: (params) =>
    api
      .get("/admin/topic-labels/progress", { ...options, params })
      .then((r) => r.data),
};
