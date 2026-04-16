"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  Megaphone,
  Settings,
  Zap,
  FolderOpen,
  Upload,
  MessageSquare,
} from "lucide-react";

interface Profile {
  name: string;
  role: string;
  company: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [overdueCount, setOverdueCount] = useState(0);
  const [vorgaengeCount, setVorgaengeCount] = useState(0);
  const [chatsCount, setChatsCount] = useState(0);
  const [profile, setProfile] = useState<Profile>({ name: "", role: "", company: "" });

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
    { href: "/contacts",  label: "Kontakte",      icon: Users },
    { href: "/chats",     label: "Chats",          icon: MessageSquare, badge: chatsCount },
    { href: "/tasks",     label: "Aufgaben",       icon: ClipboardList, badge: overdueCount },
    { href: "/vorgaenge", label: "Vorgänge",       icon: FolderOpen,    badge: vorgaengeCount },
    { href: "/campaigns", label: "Kampagnen",      icon: Megaphone },
    { href: "/import",    label: "Import",         icon: Upload },
    { href: "/settings",  label: "Einstellungen",  icon: Settings },
  ];

  // Display fallbacks
  const displayName    = profile.name    || "Mein Profil";
  const displayRole    = profile.role    || "Versicherungsmakler";
  const displayInitial = (profile.name || "M").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col w-56 min-h-screen bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-lime-500 flex items-center justify-center shadow-sm shadow-lime-500/30 flex-shrink-0">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[13px] text-slate-900 leading-tight tracking-tight truncate">
            {profile.company || "Stevie's CRM"}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight font-medium">
            Versicherungen
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p className="px-3 pt-1 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Menü
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-lime-50 text-lime-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon
                className={`flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                  isActive ? "text-lime-600" : "text-slate-400"
                }`}
                size={17}
              />
              <span className="flex-1 leading-none">{item.label}</span>
              {item.badge ? (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1 rounded-full shadow-sm shadow-red-500/30">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm flex-shrink-0">
            {displayInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-700 truncate leading-tight">
              {displayName}
            </div>
            <div className="text-[10px] text-slate-400 truncate leading-tight">
              {displayRole}
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-lime-400 flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
