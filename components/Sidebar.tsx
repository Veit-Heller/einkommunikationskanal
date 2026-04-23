"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useTheme } from "@/components/ThemeProvider";

interface Profile {
  name: string;
  role: string;
  company: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, toggle } = useTheme();
  const [overdueCount, setOverdueCount]     = useState(0);
  const [vorgaengeCount, setVorgaengeCount] = useState(0);
  const [chatsCount, setChatsCount]         = useState(0);
  const [profile, setProfile]               = useState<Profile>({ name: "", role: "", company: "", logoUrl: null });

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [tasksRes, vorgaengeRes, chatsRes] = await Promise.all([
          fetch("/api/tasks/count"),
          fetch("/api/vorgaenge/count"),
          fetch("/api/messages"),
        ]);
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setOverdueCount(data.count || 0);
        }
        if (vorgaengeRes.ok) {
          const data = await vorgaengeRes.json();
          setVorgaengeCount(data.total || 0);
        }
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          const inbound = (data.conversations || []).filter(
            (c: { direction: string }) => c.direction === "inbound"
          ).length;
          setChatsCount(inbound);
        }
      } catch { /* ignore */ }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); })
      .catch(() => {});
  }, []);

  const navItems = [
    { href: "/contacts",    label: "Kontakte",          icon: "solar:users-group-rounded-linear" },
    { href: "/chats",       label: "Chats",              icon: "solar:chat-round-line-linear",   badge: chatsCount },
    { href: "/tasks",       label: "Aufgaben",           icon: "solar:checklist-linear",         badge: overdueCount },
    { href: "/vorgaenge",   label: "Vorgänge",           icon: "solar:folder-open-linear",       badge: vorgaengeCount },
    { href: "/campaigns",   label: "Kampagnen",          icon: "solar:megaphone-linear" },
    { href: "/automations", label: "Automatisierungen",  icon: "solar:bolt-linear" },
  ];

  const displayName    = profile.name    || "Mein Profil";
  const displayRole    = profile.role    || "Versicherungsmakler";
  const displayInitial = (profile.name || "M").charAt(0).toUpperCase();

  return (
    <div
      className="flex flex-col w-56 min-h-screen flex-shrink-0"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {/* Logo display */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: profile.logoUrl ? "transparent" : "var(--logo-bg)" }}>
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoUrl} alt="Logo" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <Icon icon="solar:bolt-linear" style={{ color: "var(--logo-color)", width: 16, height: 16 }} />
          )}
        </div>

        <div className="min-w-0">
          <div
            className="font-bold text-[13px] leading-tight tracking-tight truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {profile.company || "Stevie's CRM"}
          </div>
          <div className="text-[10px] leading-tight font-medium" style={{ color: "var(--text-secondary)" }}>
            Versicherungen
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p
          className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--section-label)" }}
        >
          Menü
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: isActive ? "var(--nav-active-bg)" : "transparent",
                color: isActive ? "var(--nav-active-text)" : "var(--nav-text)",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <Icon
                icon={item.icon}
                style={{
                  color: isActive ? "var(--nav-active-icon)" : "var(--nav-icon)",
                  width: 17,
                  height: 17,
                  flexShrink: 0,
                }}
              />
              <span className="flex-1 leading-none">{item.label}</span>
              {item.badge ? (
                <span
                  className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1 rounded-full"
                  style={{ background: "var(--badge-bg)", color: "var(--badge-text)" }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className="px-3 pb-4 pt-3 space-y-0.5"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
          style={{ transition: "all 150ms ease" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden"
            style={{ background: profile.avatarUrl ? "transparent" : "var(--avatar-bg)", color: "var(--avatar-text)" }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="Avatar" style={{ width: 28, height: 28, objectFit: "cover" }} />
            ) : (
              displayInitial
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate leading-tight" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </div>
            <div className="text-[10px] truncate leading-tight" style={{ color: "var(--text-secondary)" }}>
              {displayRole}
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#F2EAD3" }} />
        </Link>
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all"
          style={{ color: "var(--text-secondary)", transition: "all 150ms ease" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <Icon icon={theme === "dark" ? "solar:sun-linear" : "solar:moon-linear"} style={{ width: 16, height: 16, flexShrink: 0 }} />
          {theme === "dark" ? "Hell" : "Dunkel"}
        </button>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all"
          style={{ color: "var(--text-secondary)", transition: "all 150ms ease" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "#EF4444";
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <Icon icon="solar:logout-linear" style={{ width: 16, height: 16, flexShrink: 0 }} />
          Abmelden
        </button>
      </div>
    </div>
  );
}
