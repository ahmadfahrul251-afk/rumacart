"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { User, FulfillmentPoint, Role } from "@/types";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin Pusat",
  ADMIN_POINT: "Admin Point",
  KASIR: "Kasir",
  GUDANG: "Gudang",
  KURIR: "Kurir",
};

const ROLE_OPTIONS: Role[] = ["ADMIN", "SUPER_ADMIN", "ADMIN_POINT", "KASIR", "GUDANG", "KURIR"];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "KASIR" as Role,
  managedPointId: "",
};

function UsersContent() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [points, setPoints] = useState<FulfillmentPoint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setUsers(null);
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  }

  useEffect(load, []);
  useEffect(() => {
    api.get<FulfillmentPoint[]>("/points").then(setPoints).catch(() => {});
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone || "",
      role: u.role,
      managedPointId: u.managedPointId || "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Nama wajib diisi");
    if (!editingId && !form.email.trim()) return setError("Email wajib diisi");
    if (!editingId && form.password.length < 6) return setError("Password minimal 6 karakter");
    if (form.role === "ADMIN_POINT" && !form.managedPointId) return setError("Point wajib dipilih untuk role Admin Point");

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const payload: Record<string, unknown> = {
          name: form.name,
          phone: form.phone,
          role: form.role,
          managedPointId: form.role === "ADMIN_POINT" ? form.managedPointId : null,
        };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${editingId}`, payload);
      } else {
        await api.post("/users", {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
          managedPointId: form.role === "ADMIN_POINT" ? form.managedPointId : undefined,
        });
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
    load();
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Akun</h1>
          <p className="text-sm text-ink/60">Akun staff: Admin Pusat, Admin Point, Kasir, Gudang, Kurir.</p>
        </div>
        <Button onClick={startCreate} className="!py-2 !px-4 text-sm">
          <Plus size={16} /> Tambah Akun
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <h2 className="font-semibold">{editingId ? "Edit Akun" : "Akun Baru"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nama *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email {editingId ? "" : "*"}</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editingId}
                required={!editingId}
              />
              {editingId && <p className="mt-1 text-xs text-ink/40">Email tidak bisa diubah.</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {editingId ? "Password Baru (opsional)" : "Password *"}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? "Kosongkan kalau tidak diganti" : ""}
                required={!editingId}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">No. HP</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role, managedPointId: "" })}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            {form.role === "ADMIN_POINT" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Point yang Dikelola *</label>
                <select
                  value={form.managedPointId}
                  onChange={(e) => setForm({ ...form, managedPointId: e.target.value })}
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Pilih point</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="!py-2 !px-4 text-sm">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {!users && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {users && users.length === 0 && (
        <EmptyState icon="👤" title="Belum ada akun staff" description="Tambahkan akun Kasir, Gudang, Kurir, atau Admin Point pertama." />
      )}

      {users && users.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink/50">
              <tr>
                <th className="pb-2">Nama</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Point</th>
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-black/5">
                  <td className="py-2 font-medium">
                    {u.name} {u.id === me?.id && <span className="text-xs text-ink/40">(kamu)</span>}
                  </td>
                  <td className="py-2 text-ink/60">{u.email}</td>
                  <td className="py-2">
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium">{ROLE_LABEL[u.role] || u.role}</span>
                  </td>
                  <td className="py-2 text-ink/60">{u.managedPoint ? `${u.managedPoint.name}` : "-"}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {u.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-red-100 hover:text-red-600"
                        >
                          {u.isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <UsersContent />
      </div>
    </RoleGuard>
  );
}
