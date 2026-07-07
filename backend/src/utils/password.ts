import bcrypt from "bcryptjs";

// Password TIDAK PERNAH disimpan dalam bentuk asli — selalu di-hash dulu.
// bcrypt otomatis menambahkan "salt" supaya hash yang sama tidak mudah ditebak.
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
