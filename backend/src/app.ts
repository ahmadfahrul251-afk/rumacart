import express from "express";
import cors from "cors";
import morgan from "morgan";
// Express 4 TIDAK otomatis menangkap error dari async function di dalam
// controller — kalau tidak di-"tangkap", errornya jadi "unhandled rejection"
// dan mematikan seluruh proses Node (bukan cuma gagal di satu request).
// Baris ini menambal itu: dia otomatis meneruskan error dari controller async
// ke errorHandler di bawah, jadi error jadi respons 500 biasa, bukan crash.
import "express-async-errors";
import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(morgan("dev")); // log setiap request masuk ke console — berguna saat debugging

app.get("/health", (_req, res) => res.json({ status: "ok", service: "rumacart-backend" }));
app.use("/api", routes);

// Middleware error HARUS didaftarkan paling terakhir.
app.use(errorHandler);