import axios, { type AxiosError } from "axios";

import { getSupabase } from "../lib/supabase-client";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

apiClient.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") return config;
  const { data: sessionData } = await getSupabase().auth.getSession();
  const token = sessionData.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (import.meta.env.DEV) {
      const status = error.response?.status;
      const body = error.response?.data;
      console.error("[api]", status ?? "network", body ?? error.message);
    }
    return Promise.reject(error);
  },
);
