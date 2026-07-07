"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-light px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-lg font-bold text-white">R</span>
          <h1 className="text-xl font-bold">Masuk ke RumaCart</h1>
          <p className="mt-1 text-sm text-ink/60">Belanja kebutuhan harian jadi lebih mudah.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-primary">Daftar sekarang</Link>
        </p>

        <p className="mt-3 rounded-lg bg-accent p-3 text-center text-xs text-ink/50">
          Demo: customer@rumacart.com / password123
        </p>
      </div>
    </div>
  );
}
