import axios from "axios";

export const api = axios.create({ baseURL: "/api/v1" });

// Attach stored JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taskflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("taskflow_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
