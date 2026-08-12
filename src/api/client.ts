import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

const TOKEN_KEY = "expo_invoice_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      clearToken();
    }

    return Promise.reject(error);
  }
);

export function fileUrl(
  relativeOrAbsolute?: string | null
): string | undefined {
  if (!relativeOrAbsolute) {
    return undefined;
  }

  if (relativeOrAbsolute.startsWith("http")) {
    return relativeOrAbsolute;
  }

  return `${API_BASE_URL}/files/${relativeOrAbsolute}`;
}