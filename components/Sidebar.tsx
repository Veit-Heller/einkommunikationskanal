"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users, ClipboardList, Megaphone, Zap,
  FolderOpen, MessageSquare, LogOut,
} from "lucide-react";

interface Profile { name: string; role: string; company: string; }

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [overdueCount,   setOverdueCount]   = useState(0);
  const [vorgaengeCount, setVorgaengeCount] = useState(0);
  const [chatsCount,     setChatsCount]     = useState(0);
  const [profile, setProfile] = useState<Profile>({ name: "", role: "", company: "" });

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [tasksRes, vorgaengeRes, chatsRes] = await Promise.all([
          fetch("/api/tasks/count"),
          fetch("/api/vorgaenge/count"),
          fetch("/api/messages"),
        ]);
        if (tasksRes.ok)     { const d = await tasksRes.json();     setOverdueCount(d.count || 0); }
        if (vorgaengeRes.ok) { const d = await vorgaengeRes.json(); setVorgaengeCount(d.total || 0); }
        if (chatsRes.ok) {
          const d = await chatsRes.json();
          setChatsCount((d.conversations || []).filter((c: { direction: string }) => c.direction === "inbound").length);
        }
      } catch { /* ignore */ }
    }
    fetchCounts();
    const t = setInterval(fetchCounts, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/settings/profile").then(r => r.json()).then(d => { if (d.profile) setProfile(d.profile); }).catch(() => {});
  }, []);

  const navItems = [
    { href: "/contacts",    label: "Kontakte",         icon: Users },
    { href: "/chats",       label: "Chats",             icon: MessageSquare, badge: chatsCount },
    { href: "/tasks",       label: "Aufgaben",          icon: ClipboardList, badge: overdueCount },
    { href: "/vorgaenge",   label: "Vorgänge",          icon: FolderOpen,   badge: vorgaengeCount },
    { href: "/campaigns",   label: "Kampagnen",         icon: Megaphone },
    { href: "/automations", label: "Automatisierungen", icon: Zap },
  ];

  const displayName    = profile.name || "Mein Profil";
  const displayRole    = profile.role || "Versicherungsmakler";
  const displayInitial = (profile.name || "M").charAt(0).toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 220,
        minHeight: "100vh",
        background: "rgba(255,255,255,.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(203,213,225,.7)",
        boxShadow: "rgba(0,0,0,.04) 2px 0 12px 0",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 16px", borderBottom: "1px solid rgba(203,213,225,.4)" }}>
        {/* gradient-shell logo icon */}
        <div style={{ padding: "1px", borderRadius: 9, background: "linear-gradient(135deg, #D1FAE5 0%, rgba(255,255,255,.2) 50%, #92AFA0 100%)", flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={15} fill="white" color="white" />
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4F4F50", lineHeight: 1.2, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {profile.company || "Stevie's CRM"}
          </div>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>Versicherungen</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 10px 6px" }}>
        <p style={{ padding: "4px 10px 8px", fontSize: 10, fontWeight: 700, color: "#C8C8C9", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          Menü
        </p>
        {navItems.map(item => {
          const Icon     = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                transition: "all .15s ease",
                background: isActive ? "#D1FAE5" : "transparent",
                color: isActive ? "#047857" : "#64748B",
              }}
              className={isActive ? "" : "hover:bg-white/60 hover:text-ds-1"}
            >
              <Icon
                size={16}
                style={{
                  flexShrink: 0,
                  color: isActive ? "#059669" : "#94A3B8",
                  transition: "color .15s ease",
                }}
              />
              <span style={{ flex: 1, lineHeight: 1 }}>{item.label}</span>
              {item.badge ? (
                <span style={{
                  minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700,
                  borderRadius: 9999, padding: "0 4px",
                  boxShadow: "0 1px 3px rgba(239,68,68,.35)",
                }}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: "6px 10px 10px", borderTop: "1px solid rgba(203,213,225,.4)" }}>
        <Link
          href="/settings"
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, textDecoration: "none", marginBottom: 2 }}
          className="hover:bg-white/60 transition-colors"
        >
          <div style={{ width: 26, height: 26, borderRadius: 9999, background: "linear-gradient(135deg, #D1FAE5, #92AFA0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#047857", flexShrink: 0 }}>
            {displayInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4F4F50", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
            <div style={{ fontSize: 10, color: "#94A3B8", lineHeight: 1.2 }}>{displayRole}</div>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: 9999, background: "#10B981", flexShrink: 0 }} />
        </Link>
        <button
          onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#94A3B8", transition: "all .15s" }}
          className="hover:bg-red-50/60 hover:text-red-400 transition-colors"
        >
          <LogOut size={14} style={{ flexShrink: 0 }} />
          Abmelden
        </button>
      </div>
    </div>
  );
}
