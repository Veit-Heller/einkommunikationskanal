"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  Megaphone,
  Settings,
  Shield,
  MessageSquare,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/tasks/count");
        if (res.ok) {
          const data = await res.json();
          setOverdueCount(data.count || 0);
        }
      } catch { /* ignore */ }
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: "/contacts", label: "Kontakte", icon: Users },
    { href: "/tasks", label: "Aufgaben", icon: ClipboardList, badge: overdueCount },
    { href: "/campaigns", label: "Kampagnen", icon: Megaphone },
    { href: "/settings", label: "Einstellungen", icon: Settings },
  ];

  return (
    <div className="flex flex-col w-64 min-h-screen bg-[#0f0f1a] text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight tracking-tight">Stevie&apos;s CRM</div>
          <div className="text-[11px] text-white/40 leading-tight">Versicherungen</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="px-3 pt-1 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
          Menü
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-white/60 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <Icon className="flex-shrink-0 transition-transform group-hover:scale-110" size={17} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full shadow shadow-red-500/40 animate-pulse">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold shadow">
            S
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">Stevie</div>
            <div className="text-[10px] text-white/35 truncate">Versicherungsmakler</div>
          </div>
          <MessageSquare className="w-3.5 h-3.5 text-white/25" />
        </div>
      </div>
    </div>
  );
}
