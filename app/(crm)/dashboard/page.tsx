"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import PageHeader from "@/components/PageHeader";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  completed: boolean;
  contact: { id: string; firstName: string; lastName: string };
}

interface Vorgang {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  contact: { id: string; firstName: string; lastName: string };
}

interface ActivityItem {
  type: "message" | "task" | "vorgang";
  id: string;
  at: string;
  contactName: string;
  contactId: string;
  label: string;
  content?: string;
  channel?: string;
  direction?: string;
  completed?: boolean;
  status?: string;
}

interface DashboardData {
  overdueTasks: Task[];
  tasksToday: Task[];
  vorgaengeOpen: Vorgang[];
  vorgaengeEingereicht: Vorgang[];
  vorgaengeAbgeschlossenThisMonth: number;
  inboundMessagesCount: number;
  newContactsCount: number;
  totalContacts: number;
  activityFeed: ActivityItem[];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function formatDue(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function taskTypeIcon(type: string) {
  switch (type) {
    case "call": return "solar:phone-linear";
    case "email": return "solar:letter-linear";
    case "meeting": return "solar:calendar-linear";
    default: return "solar:check-circle-linear";
  }
}

const activityIcon: Record<string, string> = {
  message: "solar:chat-square-2-linear",
  task: "solar:checklist-linear",
  vorgang: "solar:document-text-linear",
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long",
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        <Icon icon="solar:spinner-linear" className="animate-spin" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!data) return null;

  const hasAlerts = data.overdueTasks.length > 0 || data.vorgaengeEingereicht.length > 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={greeting()}
        subtitle={today}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">

        {/* ── Alarm-Karten ── */}
        {hasAlerts && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.overdueTasks.length > 0 && (
              <Link href="/tasks" className="block">
                <div
                  className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-opacity hover:opacity-90"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.15)" }}>
                    <Icon icon="solar:danger-triangle-linear" style={{ color: "#EF4444", width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "#EF4444" }}>
                      {data.overdueTasks.length} überfällige {data.overdueTasks.length === 1 ? "Aufgabe" : "Aufgaben"}
                    </div>
                    <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                      {data.overdueTasks[0]?.title}
                      {data.overdueTasks.length > 1 && ` +${data.overdueTasks.length - 1} weitere`}
                    </div>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" style={{ color: "#EF4444", width: 16, height: 16, marginLeft: "auto", flexShrink: 0 }} />
                </div>
              </Link>
            )}

            {data.vorgaengeEingereicht.length > 0 && (
              <Link href="/vorgaenge" className="block">
                <div
                  className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-opacity hover:opacity-90"
                  style={{ background: "rgba(242,234,211,0.08)", border: "1px solid rgba(242,234,211,0.2)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(242,234,211,0.1)" }}>
                    <Icon icon="solar:inbox-in-linear" style={{ color: "#F2EAD3", width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "#F2EAD3" }}>
                      {data.vorgaengeEingereicht.length} {data.vorgaengeEingereicht.length === 1 ? "Vorgang eingereicht" : "Vorgänge eingereicht"}
                    </div>
                    <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                      Warten auf deine Prüfung
                    </div>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" style={{ color: "#F2EAD3", width: 16, height: 16, marginLeft: "auto", flexShrink: 0 }} />
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── Stat-Karten ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Kontakte",
              value: data.totalContacts,
              sub: `+${data.newContactsCount} diesen Monat`,
              icon: "solar:users-group-rounded-linear",
              href: "/contacts",
              color: "var(--text-primary)",
            },
            {
              label: "Offene Vorgänge",
              value: data.vorgaengeOpen.length,
              sub: `${data.vorgaengeAbgeschlossenThisMonth} abgeschlossen diesen Monat`,
              icon: "solar:document-text-linear",
              href: "/vorgaenge",
              color: "var(--text-primary)",
            },
            {
              label: "Aufgaben heute",
              value: data.tasksToday.length,
              sub: data.overdueTasks.length > 0 ? `${data.overdueTasks.length} überfällig` : "Alles im Plan",
              icon: "solar:checklist-linear",
              href: "/tasks",
              color: "var(--text-primary)",
              subColor: data.overdueTasks.length > 0 ? "#EF4444" : undefined,
            },
            {
              label: "Nachrichten",
              value: data.inboundMessagesCount,
              sub: "eingehend gesamt",
              icon: "solar:chat-square-2-linear",
              href: "/chats",
              color: "var(--text-primary)",
            },
          ].map((stat) => (
            <Link key={stat.label} href={stat.href} className="block">
              <div
                className="rounded-2xl p-4 transition-all hover:opacity-90 cursor-pointer h-full"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon={stat.icon} style={{ color: "var(--text-secondary)", width: 15, height: 15 }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{stat.label}</span>
                </div>
                <div className="text-2xl font-bold leading-none mb-1" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-[11px] leading-tight" style={{ color: stat.subColor || "var(--text-tertiary)" }}>
                  {stat.sub}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Hauptinhalt: 2 Spalten ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Linke Spalte (2/3) */}
          <div className="md:col-span-2 space-y-5">

            {/* Aufgaben heute + überfällig */}
            {(data.tasksToday.length > 0 || data.overdueTasks.length > 0) && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:checklist-linear" style={{ color: "var(--text-secondary)", width: 15, height: 15 }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Aufgaben</span>
                  </div>
                  <Link href="/tasks" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Alle →
                  </Link>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {[...data.overdueTasks.slice(0, 3), ...data.tasksToday.slice(0, 3)].map((task) => {
                    const isOverdue = !data.tasksToday.find((t) => t.id === task.id);
                    return (
                      <Link key={task.id} href={`/contacts/${task.contact.id}`} className="flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isOverdue ? "rgba(239,68,68,0.12)" : "var(--input-bg)" }}>
                          <Icon icon={taskTypeIcon(task.type)}
                            style={{ color: isOverdue ? "#EF4444" : "var(--text-secondary)", width: 14, height: 14 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {task.title}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {[task.contact.firstName, task.contact.lastName].filter(Boolean).join(" ")}
                          </div>
                        </div>
                        <div className="text-xs flex-shrink-0" style={{ color: isOverdue ? "#EF4444" : "var(--text-tertiary)" }}>
                          {isOverdue ? `Seit ${formatDue(task.dueDate)}` : formatDue(task.dueDate)}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Offene Vorgänge */}
            {data.vorgaengeOpen.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:document-text-linear" style={{ color: "var(--text-secondary)", width: 15, height: 15 }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Offene Vorgänge</span>
                  </div>
                  <Link href="/vorgaenge" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Alle →
                  </Link>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {data.vorgaengeOpen.slice(0, 5).map((v) => (
                    <Link key={v.id} href={`/contacts/${v.contact.id}`} className="flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--input-bg)" }}>
                        <Icon icon="solar:document-text-linear"
                          style={{ color: "var(--text-secondary)", width: 14, height: 14 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {v.title}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {[v.contact.firstName, v.contact.lastName].filter(Boolean).join(" ")}
                        </div>
                      </div>
                      {v.dueDate && (
                        <div className="text-xs flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                          bis {formatDue(v.dueDate)}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Leerer Zustand */}
            {data.tasksToday.length === 0 && data.overdueTasks.length === 0 && data.vorgaengeOpen.length === 0 && (
              <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <Icon icon="solar:check-circle-linear" style={{ color: "#22C55E", width: 32, height: 32, margin: "0 auto 8px" }} />
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Alles erledigt!</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Keine offenen Aufgaben oder Vorgänge.</div>
              </div>
            )}
          </div>

          {/* Rechte Spalte (1/3) */}
          <div className="space-y-5">

            {/* Schnellaktionen */}
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="solar:bolt-linear" style={{ color: "var(--text-secondary)", width: 15, height: 15 }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Schnellaktionen</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Neuer Kontakt", icon: "solar:user-plus-linear", href: "/contacts" },
                  { label: "Neue Aufgabe", icon: "solar:add-circle-linear", href: "/tasks" },
                  { label: "Neuer Vorgang", icon: "solar:document-add-linear", href: "/vorgaenge" },
                  { label: "Alle Chats", icon: "solar:chat-square-2-linear", href: "/chats" },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:opacity-80"
                    style={{ background: "var(--input-bg)" }}
                  >
                    <Icon icon={action.icon} style={{ color: "var(--text-secondary)", width: 15, height: 15 }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{action.label}</span>
                    <Icon icon="solar:alt-arrow-right-linear" style={{ color: "var(--text-dim)", width: 13, height: 13, marginLeft: "auto" }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Aktivitäts-Feed */}
            {data.activityFeed.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:history-linear" style={{ color: "var(--text-secondary)", width: 15, height: 15 }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Letzte Aktivität</span>
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {data.activityFeed.slice(0, 8).map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={`/contacts/${item.contactId}`}
                      className="flex items-start gap-3 px-4 py-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "var(--input-bg)" }}>
                        <Icon icon={activityIcon[item.type]}
                          style={{ color: "var(--text-secondary)", width: 12, height: 12 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {item.contactName}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
                          {item.label}
                          {item.content && ` · ${item.content}`}
                        </div>
                      </div>
                      <div className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: "var(--text-dim)" }}>
                        {relativeTime(item.at)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
