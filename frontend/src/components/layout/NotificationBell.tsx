"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Tag, Package, Info } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Notification } from "@/types";

const POLL_INTERVAL_MS = 20000;

const TYPE_ICON: Record<string, any> = { ORDER: Package, PROMO: Tag, SYSTEM: Info };

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function loadUnreadCount() {
    api.get<{ count: number }>("/notifications/unread-count").then((r) => setUnread(r.count)).catch(() => {});
  }

  function loadList() {
    api.get<Notification[]>("/notifications/my").then(setNotifications).catch(() => setNotifications([]));
  }

  useEffect(() => {
    if (!user) return;
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setUnread(0);
    setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) || null);
  }

  async function handleClickNotif(n: Notification) {
    if (!n.isRead) {
      await api.patch(`/notifications/${n.id}/read`);
      setNotifications((prev) => prev?.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) || null);
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.type === "PROMO") router.push("/promo");
    else if (n.type === "ORDER") router.push("/orders");
  }

  if (!user) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button onClick={toggleOpen} className="relative rounded-xl p-2.5 hover:bg-accent" aria-label="Notifikasi">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-secondary text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-2xl border border-black/5 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <p className="font-semibold">Notifikasi</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <CheckCheck size={13} /> Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!notifications && (
              <div className="p-4 text-center text-sm text-ink/50">Memuat...</div>
            )}
            {notifications?.length === 0 && (
              <div className="p-6 text-center text-sm text-ink/50">Belum ada notifikasi.</div>
            )}
            {notifications?.map((n) => {
              const Icon = TYPE_ICON[n.type] || Info;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  className={`flex w-full items-start gap-3 border-b border-black/5 px-4 py-3 text-left last:border-b-0 hover:bg-accent ${
                    !n.isRead ? "bg-primary-light/40" : ""
                  }`}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />}
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink/60">{n.message}</p>
                    <p className="mt-1 text-[11px] text-ink/40">{timeAgo(n.createdAt)}</p>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
