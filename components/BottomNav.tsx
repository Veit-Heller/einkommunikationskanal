"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useTheme } from "@/components/ThemeProvider";

export default function BottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { theme, toggle } = useTheme();
  const [overdueCount,   setOverdueCount]   = useState(0);
  const [vorgaengeCount, setVorgaengeCount] = useState(0);
  const [chatsCount,     setChatsCount]     = useState(0);
  const [showMore,       setShowMore]       = useState(false);

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
        if (chatsRes.ok)     {
          const d = await chatsRes.json();
          setChatsCount((d.conversations || []).filter((c: { direction: string }) => c.direction === "inbound").length);
        }
      } catch { /* ignore */ }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const mainItems = [
    { href: "/contacts",  label: "Kontakte", icon: "solar:users-group-rounded-linear", badge: 0 },
    { href: "/chats",     label: "Chats",    icon: "solar:chat-square-2-linear",       badge: chatsCount },
    { href: "/tasks",     label: "Aufgaben", icon: "solar:checklist-linear",            badge: overdueCount },
    { href: "/vorgaenge", label: "Vorgänge", icon: "solar:document-text-linear",        badge: vorgaengeCount },
  ];

  const moreItems = [
    { href: "/campaigns",   label: "Kampagnen",         icon: "solar:rocket-linear" },
    { href: "/automations", label: "Automatisierungen",  icon: "solar:bolt-linear" },
    { href: "/settings",    label: "Einstellungen",      icon: "solar:settings-linear" },
  ];

  return (
    <>
      {/* More overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 mx-3 rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {moreItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{
                    color: isActive ? "var(--nav-active-text)" : "var(--text-primary)",
                    background: isActive ? "var(--nav-active-bg)" : "transparent",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <Icon icon={item.icon} style={{ width: 20, height: 20, color: isActive ? "var(--nav-active-icon)" : "var(--nav-icon)" }} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            {/* Theme toggle */}
            <button
              onClick={() => { toggle(); setShowMore(false); }}
              className="w-full flex items-center gap-4 px-5 py-4"
              style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}
            >
              <Icon icon={theme === "dark" ? "solar:sun-linear" : "solar:moon-linear"} style={{ width: 20, height: 20, color: "var(--nav-icon)" }} />
              <span className="text-sm font-medium">{theme === "dark" ? "Helles Theme" : "Dunkles Theme"}</span>
            </button>
            {/* Logout */}
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              className="w-full flex items-center gap-4 px-5 py-4"
              style={{ color: "#EF4444" }}
            >
              <Icon icon="solar:logout-linear" style={{ width: 20, height: 20 }} />
              <span className="text-sm font-medium">Abmelden</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden flex items-stretch"
        style={{
          background: "var(--sidebar-bg)",
          borderTop: "1px solid var(--sidebar-border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {mainItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative"
              style={{ color: isActive ? "var(--nav-active-icon)" : "var(--nav-icon)" }}
            >
              <div className="relative">
                <Icon icon={item.icon} style={{ width: 22, height: 22 }} />
                {item.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold px-0.5 rounded-full"
                    style={{ background: "var(--badge-bg)", color: "var(--badge-text)" }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "var(--nav-active-icon)" }}
                />
              )}
            </Link>
          );
        })}

        {/* Mehr button */}
        <button
          onClick={() => setShowMore(v => !v)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
          style={{ color: showMore ? "var(--nav-active-icon)" : "var(--nav-icon)" }}
        >
          <Icon icon={showMore ? "solar:close-circle-linear" : "solar:widget-linear"} style={{ width: 22, height: 22 }} />
          <span className="text-[10px] font-medium leading-none">Mehr</span>
        </button>
      </nav>
    </>
  );
}
