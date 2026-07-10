"use client";

// Wrapper kecil di atas fetch() supaya semua request ke backend
// otomatis membawa base URL dan token JWT (kalau user sudah login).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("rumacart_token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Terjadi kesalahan pada server");
  }
  return json.data;
}

// Upload file (multipart/form-data) — TIDAK boleh pakai header
// "Content-Type": "application/json" seperti request() di atas, karena
// browser perlu menentukan sendiri "boundary" untuk FormData.
async function uploadFile<T>(path: string, file: File, fieldName = "image"): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("rumacart_token") : null;
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });

  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal upload file");
  }
  return json.data;
}

// Buka file (PDF, dll) yang butuh header Authorization di tab baru — <a href>
// biasa tidak bisa membawa header, jadi kita fetch dulu sebagai blob lalu buka.
async function openFile(path: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("rumacart_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error("Gagal membuka dokumen");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: uploadFile,
  openFile,
};
