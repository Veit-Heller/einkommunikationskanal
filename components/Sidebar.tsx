"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Upload,
  Megaphone,
  Settings,
  Shield,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { href: "/contacts", label: "Kontakte", icon: Users },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/campaigns", label: "Kampagnen", icon: Megaphone },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 min-h-screen bg-[#1a1a2e] text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight">Stevie&apos;s CRM</div>
          <div className="text-xs text-white/50 leading-tight">Versicherungen</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
          Hauptmenü
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {item.label}
              {item.href === "/campaigns" && (
                <span className="ml-auto bg-blue-500/30 text-blue-300 text-xs px-1.5 py-0.5 rounded-full">
                  Neu
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            S
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">Stevie</div>
            <div className="text-xs text-white/40 truncate">Versicherungsmakler</div>
          </div>
          <MessageSquare className="w-4 h-4 text-white/30" />
        </div>
      </div>
    </div>
  );
}
