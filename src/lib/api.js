import axios from "axios";

export const API = "/api";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Fallback: attach bearer token from localStorage if cookie fails (cross-site edge case)
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("dz_token") : null;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

