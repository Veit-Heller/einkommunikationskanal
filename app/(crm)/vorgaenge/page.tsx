"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen, Clock, CheckCheck, Upload,
  User, FileText, Copy, Check, Loader2,
  Bell, Send, Activity, AlertTriangle,
  Zap, X, ChevronRight, CalendarClock, ChevronDown, ChevronUp,
} from "lucide-react";
import ContactDrawer from "@/components/ContactDrawer";
import PageHeader from "@/components/PageHeader";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";

interface Vorgang {
  id: string;
  title: string;
  description: string | null;
  status: string;
  token: string;
  createdAt: string;
  checklist: string; // raw JSON
  files: string;     // raw JSON
  portalSentAt: string | null;
  lastActivityAt: string | null;
  reminderCount: number;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  offen:        { label: "Offen",        color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400" },
  teilweise:    { label: "Teilweise",    color: "text-orange-700", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-400" },
  eingereicht:  { label: "Eingereicht",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-500" },
  abgeschlossen:{ label: "Abgeschlossen",color: "text-slate-500",  bg: "bg-slate-50 border-slate-200",   dot: "bg-slate-400" },
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface PipelineEntry {
  id: string;
  title: string;
  contact: { id: string; firstName: string | null; lastName: string | null; company: string | null };
  reminderCount: number;
  filesCount: number;
  portalSentAt: string | null;
  firesAt: string | null;
  state: "unsent" | "partial" | "scheduled" | "due" | "maxed";
  daysUntil: number;
  label: string;
}

function isOverdue(v: Vorgang): boolean {
  if (v.status !== "offen") return false;
  const age = Date.now() - new Date(v.createdAt).getTime();
  return age > SEVEN_DAYS_MS && !v.lastActivityAt;
}

function parseJSON(s: string) {
  try { return JSON.parse(s); } catch { return []; }
}

function contactName(c: Vorgang["contact"]) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "Unbekannt";
}

function groupVorgaenge(vorgaenge: Vorgang[]) {
  const overdue: Vorgang[] = [], teilweise: Vorgang[] = [],
        eingereicht: Vorgang[] = [], offen: Vorgang[] = [],
        abgeschlossen: Vorgang[] = [];

  for (const v of vorgaenge) {
    if (v.status === "abgeschlossen") { abgeschlossen.push(v); continue; }
    if (v.status === "teilweise")     { teilweise.push(v);     continue; }
    if (v.status === "eingereicht")   { eingereicht.push(v);   continue; }
    if (isOverdue(v))                 { overdue.push(v);       continue; }
    offen.push(v);
  }

  // Most recent activity first within each group
  const byActivity = (a: Vorgang, b: Vorgang) =>
    new Date(b.lastActivityAt || b.createdAt).getTime() -
    new Date(a.lastActivityAt || a.createdAt).getTime();

  return {
    overdue:      overdue.sort(byActivity),
    teilweise:    teilweise.sort(byActivity),
    eingereicht:  eingereicht.sort(byActivity),
    offen:        offen.sort(byActivity),
    abgeschlossen: abgeschlossen.sort(byActivity),
  };
}

export default function VorgaengePage() {
  const [vorgaenge, setVorgaenge]         = useState<Vorgang[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showAbgeschlossen, setShowAbgeschlossen] = useState(false);
  const [copiedId, setCopiedId]           = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);
  const [drawerVorgangId, setDrawerVorgangId] = useState<string | null>(null);
  const [showAutomations, setShowAutomations] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [nextCronRun, setNextCronRun] = useState<string | null>(null);
  const [loadingAutomations, setLoadingAutomations] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vorgaenge");
      const data = await res.json();
      setVorgaenge((data.vorgaenge || []).map((v: Vorgang) => ({
        ...v,
        portalSentAt:   v.portalSentAt   || null,
        lastActivityAt: v.lastActivityAt || null,
        reminderCount:  v.reminderCount  ?? 0,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openAutomations() {
    setShowAutomations(true);
    if (pipeline.length > 0) return; // already loaded
    setLoadingAutomations(true);
    try {
      const res = await fetch("/api/automations/preview");
      const data = await res.json();
      setPipeline(data.pipeline || []);
      setNextCronRun(data.nextCronRun || null);
    } catch { /* ignore */ }
    finally { setLoadingAutomations(false); }
  }

  async function markAbgeschlossen(id: string) {
    setUpdatingId(id);
    try {
      await fetch(`/api/vorgaenge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "abgeschlossen" }),
      });
      setVorgaenge(prev => prev.map(v => v.id === id ? { ...v, status: "abgeschlossen" } : v));
    } finally {
      setUpdatingId(null);
    }
  }

  async function sendReminder(id: string) {
    setRemindingId(id);
    try {
      const res = await fetch(`/api/vorgaenge/${id}/remind`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setVorgaenge(prev => prev.map(v => v.id === id
          ? { ...v, reminderCount: data.reminderCount, lastReminderAt: data.lastReminderAt }
          : v
        ));
      }
    } finally {
      setRemindingId(null);
    }
  }

  async function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/portal/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const groups       = groupVorgaenge(vorgaenge);
  const overdueCount = groups.overdue.length;
  const counts = {
    teilweise:    groups.teilweise.length,
    eingereicht:  groups.eingereicht.length,
    abgeschlossen: groups.abgeschlossen.length,
  };

  const sections = [
    {
      key: "overdue",
      label: "Überfällig",
      items: groups.overdue,
      labelColor: "text-red-600",
      dotColor: "bg-red-500",
      badgeBg: "bg-red-50 text-red-600 border-red-100",
    },
    {
      key: "teilweise",
      label: "Teilweise eingereicht",
      items: groups.teilweise,
      labelColor: "text-orange-700",
      dotColor: "bg-orange-400",
      badgeBg: "bg-orange-50 text-orange-700 border-orange-100",
    },
    {
      key: "eingereicht",
      label: "Eingereicht",
      items: groups.eingereicht,
      labelColor: "text-blue-700",
      dotColor: "bg-blue-500",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      key: "offen",
      label: "Offen",
      items: groups.offen,
      labelColor: "text-amber-700",
      dotColor: "bg-amber-400",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-100",
    },
  ].filter(s => s.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Vorgänge"
        subtitle="Dokumentenanfragen & Kunden-Portal"
        actions={
          <>
            {counts.teilweise > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-orange-700">{counts.teilweise} unvollständig</span>
              </div>
            )}
            {counts.eingereicht > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl">
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700">{counts.eingereicht} neu eingereicht</span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-700">{overdueCount} überfällig</span>
              </div>
            )}
            <button
              onClick={openAutomations}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-violet-700">Automationen</span>
            </button>
          </>
        }
      />

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto p-6">
        {vorgaenge.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mb-4 shadow-sm">
              <FolderOpen className="w-7 h-7 text-slate-200" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Noch keine Vorgänge</p>
            <p className="text-xs text-slate-300 mt-1">Erstelle Vorgänge in der Kontakt-Ansicht</p>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl">

            {/* Active sections: Überfällig → Teilweise → Eingereicht → Offen */}
            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-slate-400">Alles erledigt 🎉</p>
                <p className="text-xs text-slate-300 mt-1">Keine offenen Vorgänge</p>
              </div>
            )}

            {sections.map(section => (
              <div key={section.key}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${section.dotColor}`} />
                  <p className={`text-xs font-bold uppercase tracking-widest ${section.labelColor}`}>
                    {section.label}
                  </p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${section.badgeBg}`}>
                    {section.items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {section.items.map(vorgang => {
                    const cfg = STATUS_CONFIG[vorgang.status] || STATUS_CONFIG.offen;
                    const checklist = parseJSON(vorgang.checklist);
                    const files = parseJSON(vorgang.files);
                    const completedItems = checklist.filter((i: { completed: boolean }) => i.completed).length;
                    const isUpdating  = updatingId === vorgang.id;
                    const isReminding = remindingId === vorgang.id;
                    const overdue = isOverdue(vorgang);
                    const canRemind = (vorgang.status === "offen" || vorgang.status === "teilweise") && !!vorgang.portalSentAt;

              return (
                <div
                  key={vorgang.id}
                  onClick={() => { setDrawerContactId(vorgang.contact.id); setDrawerVorgangId(vorgang.id); }}
                  className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    overdue ? "border-red-200 hover:border-red-300" : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Status dot */}
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${overdue ? "bg-red-500" : cfg.dot}`} />

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{vorgang.title}</p>
                            <p className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                              <User className="w-3 h-3" />
                              {contactName(vorgang.contact)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {overdue && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-[10px] font-bold text-red-600">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Überfällig
                              </span>
                            )}
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(vorgang.createdAt), { addSuffix: true, locale: de })}
                          </span>
                          {vorgang.lastActivityAt && (
                            <span className="flex items-center gap-1 text-lime-600">
                              <Activity className="w-3 h-3" />
                              aktiv {formatDistanceToNow(new Date(vorgang.lastActivityAt), { addSuffix: true, locale: de })}
                            </span>
                          )}
                          {checklist.length > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" />
                              {completedItems}/{checklist.length} Punkte
                            </span>
                          )}
                          {files.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {files.length} {files.length === 1 ? "Datei" : "Dateien"}
                            </span>
                          )}
                          {vorgang.reminderCount > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Bell className="w-3 h-3" />
                              {vorgang.reminderCount}× erinnert
                            </span>
                          )}
                          {!vorgang.portalSentAt && vorgang.status === "offen" && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <Send className="w-3 h-3" />
                              Nicht gesendet
                            </span>
                          )}
                        </div>

                        {/* eingereicht: show uploaded files */}
                        {vorgang.status === "eingereicht" && files.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Upload className="w-3 h-3" /> Hochgeladene Dokumente
                            </p>
                            <ul className="space-y-1">
                              {files.map((f: { id: string; name: string; url: string; size: number }) => (
                                <li key={f.id} className="flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                  <a
                                    href={`/api/blob/download?url=${encodeURIComponent(f.url)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-blue-700 hover:underline truncate"
                                  >
                                    {f.name}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyLink(vorgang.token, vorgang.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-all"
                          >
                            {copiedId === vorgang.id ? (
                              <><Check className="w-3.5 h-3.5 text-lime-500" /> Kopiert</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Portal-Link</>
                            )}
                          </button>

                          {canRemind && (
                            <button
                              onClick={(e) => { e.stopPropagation(); sendReminder(vorgang.id); }}
                              disabled={isReminding}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-all"
                            >
                              {isReminding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Bell className="w-3.5 h-3.5" />
                              )}
                              Erinnern
                              {vorgang.reminderCount > 0 && (
                                <span className="text-amber-500">({vorgang.reminderCount}/2)</span>
                              )}
                            </button>
                          )}

                          {vorgang.status !== "abgeschlossen" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAbgeschlossen(vorgang.id); }}
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-lime-500 text-white rounded-lg hover:bg-lime-600 disabled:opacity-50 transition-all"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                              )}
                              Abschließen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        ))}

            {/* Abgeschlossen — collapsible at bottom */}
            {groups.abgeschlossen.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAbgeschlossen(s => !s)}
                  className="flex items-center gap-2 mb-3 group"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
                    Abgeschlossen
                  </p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-400 border-slate-200">
                    {groups.abgeschlossen.length}
                  </span>
                  {showAbgeschlossen
                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
                </button>

                {showAbgeschlossen && (
                  <div className="space-y-3 opacity-60">
                    {groups.abgeschlossen.map(vorgang => {
                      const cfg = STATUS_CONFIG.abgeschlossen;
                      const checklist = parseJSON(vorgang.checklist);
                      const files = parseJSON(vorgang.files);
                      const completedItems = checklist.filter((i: { completed: boolean }) => i.completed).length;
                      return (
                        <div
                          key={vorgang.id}
                          onClick={() => { setDrawerContactId(vorgang.contact.id); setDrawerVorgangId(vorgang.id); }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0 bg-slate-300" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-900 text-sm">{vorgang.title}</p>
                                    <p className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                                      <User className="w-3 h-3" />
                                      {contactName(vorgang.contact)}
                                    </p>
                                  </div>
                                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                    {cfg.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(vorgang.createdAt), { addSuffix: true, locale: de })}
                                  </span>
                                  {checklist.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <CheckCheck className="w-3 h-3" />
                                      {completedItems}/{checklist.length} Punkte
                                    </span>
                                  )}
                                  {files.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      {files.length} {files.length === 1 ? "Datei" : "Dateien"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {drawerContactId && (
        <ContactDrawer
          contactId={drawerContactId}
          onClose={() => { setDrawerContactId(null); setDrawerVorgangId(null); }}
          initialTab="vorgaenge"
          openVorgangId={drawerVorgangId ?? undefined}
        />
      )}

      {showAutomations && (
        <AutomationPanel
          pipeline={pipeline}
          nextCronRun={nextCronRun}
          loading={loadingAutomations}
          onContactClick={setDrawerContactId}
          onClose={() => setShowAutomations(false)}
        />
      )}
    </div>
  );
}

// ── Automation Panel ──────────────────────────────────────────────────────────

function AutomationPanel({
  pipeline, nextCronRun, loading, onContactClick, onClose,
}: {
  pipeline: PipelineEntry[];
  nextCronRun: string | null;
  loading: boolean;
  onContactClick: (id: string) => void;
  onClose: () => void;
}) {
  function cName(c: PipelineEntry["contact"]) {
    return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "Unbekannt";
  }

  const groups = [
    {
      key: "unsent",
      label: "Link noch nicht gesendet",
      sublabel: "Keine Automation bis du den Link verschickst",
      items: pipeline.filter(p => p.state === "unsent"),
      dot: "bg-slate-300",
      color: "text-slate-500",
      badge: "bg-slate-100 text-slate-500",
    },
    {
      key: "partial",
      label: "Kunde lädt aktiv hoch",
      sublabel: "Dateien hochgeladen — Erinnerungen pausiert",
      items: pipeline.filter(p => p.state === "partial"),
      dot: "bg-teal-400",
      color: "text-teal-700",
      badge: "bg-teal-50 text-teal-700",
    },
    {
      key: "due",
      label: "Feuert beim nächsten Cron-Lauf",
      sublabel: nextCronRun ? `Heute um ${format(new Date(nextCronRun), "HH:mm 'Uhr'")}` : "",
      items: pipeline.filter(p => p.state === "due"),
      dot: "bg-red-500",
      color: "text-red-600",
      badge: "bg-red-50 text-red-600",
    },
    {
      key: "today",
      label: "Heute",
      sublabel: "",
      items: pipeline.filter(p => p.state === "scheduled" && p.daysUntil <= 1),
      dot: "bg-amber-400",
      color: "text-amber-700",
      badge: "bg-amber-50 text-amber-700",
    },
    {
      key: "tomorrow",
      label: "Morgen",
      sublabel: "",
      items: pipeline.filter(p => p.state === "scheduled" && p.daysUntil === 2),
      dot: "bg-blue-400",
      color: "text-blue-700",
      badge: "bg-blue-50 text-blue-700",
    },
    {
      key: "later",
      label: "Später",
      sublabel: "",
      items: pipeline.filter(p => p.state === "scheduled" && p.daysUntil > 2),
      dot: "bg-violet-400",
      color: "text-violet-700",
      badge: "bg-violet-50 text-violet-700",
    },
    {
      key: "maxed",
      label: "Keine weiteren Automationen",
      sublabel: "Max. 2 Auto-Erinnerungen erreicht — manuell erinnern",
      items: pipeline.filter(p => p.state === "maxed"),
      dot: "bg-slate-200",
      color: "text-slate-400",
      badge: "bg-slate-50 text-slate-400",
    },
  ].filter(g => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Automation-Pipeline
                {pipeline.length > 0 && (
                  <span className="ml-2 text-[11px] font-normal text-slate-400">
                    {pipeline.length} Vorgänge
                  </span>
                )}
              </h2>
              {nextCronRun && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <CalendarClock className="w-2.5 h-2.5" />
                  Nächster Cron-Lauf: {format(new Date(nextCronRun), "dd. MMM, HH:mm 'Uhr'", { locale: de })}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : pipeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-violet-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Keine offenen Vorgänge</p>
              <p className="text-xs text-slate-300 mt-1">Alle Vorgänge sind abgeschlossen oder eingereicht</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map(group => (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${group.color}`}>
                      {group.label}
                    </p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${group.badge}`}>
                      {group.items.length}
                    </span>
                  </div>
                  {group.sublabel && (
                    <p className="text-[10px] text-slate-400 -mt-1.5 mb-2">{group.sublabel}</p>
                  )}
                  <div className="space-y-1">
                    {group.items.map(entry => (
                      <button
                        key={entry.id}
                        onClick={() => { onContactClick(entry.contact.id); onClose(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group border border-transparent hover:border-slate-100"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${group.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">
                            {entry.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            <span>{cName(entry.contact)}</span>
                            <span>·</span>
                            <span>{entry.label}</span>
                            {entry.firesAt && entry.state === "scheduled" && (
                              <>
                                <span>·</span>
                                <span>{format(new Date(entry.firesAt), "dd. MMM", { locale: de })}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 group-hover:text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-slate-300 text-center pt-2 border-t border-slate-50">
                Automatische Erinnerungen täglich um 08:00 Uhr (06:00 UTC)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
