"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

function ProfileEditContent() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user!.name);
  const [phone, setPhone] = useState(user!.phone || "");
  const [image, setImage] = useState(user!.image || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const { url } = await api.upload<{ url: string }>("/upload/avatar", file);
      setImage(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<{ name: string; phone: string | null; image: string | null }>("/auth/me", {
        name,
        phone: phone || null,
        image: image || null,
      });
      updateUser(updated);
      setSuccess("Profil berhasil disimpan");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPassword.length < 6) {
      setPwError("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Konfirmasi password baru tidak cocok");
      return;
    }
    setPwSaving(true);
    try {
      await api.patch("/auth/me/password", { currentPassword, newPassword });
      setPwSuccess("Password berhasil diganti");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/profile" className="text-sm text-ink/60 hover:text-ink">Profil</Link>
          <span className="text-ink/30">/</span>
          <h1 className="text-2xl font-bold">Edit Profil</h1>
        </div>

        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <p className="font-semibold">Info Profil</p>

          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-2xl">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={name} className="h-full w-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="avatar-input"
              />
              <label
                htmlFor="avatar-input"
                className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-accent"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? "Mengupload..." : "Ganti Foto"}
              </label>
              <p className="mt-1 text-xs text-ink/40">JPG/PNG/WEBP, maksimal 5MB. Opsional.</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nama</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input value={user!.email} disabled className="opacity-60" />
            <p className="mt-1 text-xs text-ink/40">Email tidak bisa diubah.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">No. HP</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" disabled={saving || uploading} className="w-full">
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>

        <form onSubmit={handleChangePassword} className="card space-y-4">
          <p className="font-semibold">Ganti Password</p>
          <div>
            <label className="mb-1 block text-sm font-medium">Password Saat Ini</label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password Baru</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Konfirmasi Password Baru</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}

          <Button type="submit" variant="outline" disabled={pwSaving} className="w-full">
            {pwSaving ? "Menyimpan..." : "Ganti Password"}
          </Button>
        </form>
      </main>
      <Footer />
    </>
  );
}

export default function ProfileEditPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (!user) return null;
  return <ProfileEditContent />;
}
