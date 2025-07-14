// omniface-frontend/src/api/api.js
import axios from "axios";

const API_URL = "http://192.168.0.104:8000";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/login") &&
      !originalRequest.url.includes("/refrescar-token")
    ) {
      originalRequest._retry = true;

      try {
        const refresh_token = localStorage.getItem("refresh_token");
        if (!refresh_token) throw new Error("Refresh token no encontrado");

        console.log("🟡 Token expirado, intentando refrescar...");
        const res = await api.post("/auth/refrescar-token", { refresh_token });

        const nuevo_token = res.data.access_token;
        localStorage.setItem("access_token", nuevo_token);
        originalRequest.headers.Authorization = `Bearer ${nuevo_token}`;

        return api(originalRequest);
      } catch (err) {
        console.error("🔴 Error al refrescar el token:", err);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/?expirado=true";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
