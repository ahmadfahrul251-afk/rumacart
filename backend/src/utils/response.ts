import { Response } from "express";

// Format response API yang konsisten di seluruh endpoint, supaya frontend
// selalu tahu bentuk data yang akan diterima.
export function ok(res: Response, data: unknown, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function fail(res: Response, message = "Terjadi kesalahan", statusCode = 400, errors?: unknown) {
  return res.status(statusCode).json({ success: false, message, errors });
}
