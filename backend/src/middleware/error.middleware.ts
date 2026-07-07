import { Request, Response, NextFunction } from "express";
import { fail } from "../utils/response";

// Middleware terakhir di rantai — menangkap semua error yang tidak
// tertangani di controller, supaya server tidak crash dan response tetap rapi.
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  fail(res, err.message || "Internal server error", err.statusCode || 500);
}
