"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen, Clock, CheckCheck, Upload,
  User, FileText, Copy, Check, Loader2,
  Bell, Send, Activity, AlertTriangle,
} from "lucide-react";
import ContactDrawer from "@/components/ContactDrawer";
import { formatDistanceToNow } from "date-fns";
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
  offen:        { label: "Offen",        color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-400" },
  eingereicht:  { label: "Eingereicht",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    dot: "bg-blue-500" },
  abgeschlossen:{ label: "Abgeschlossen",color: "text-slate-500",  bg: "bg-slate-50 border-slate-200",  dot: "bg-slate-400" },
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

export default function VorgaengePage() {
  const [vorgaenge, setVorgaenge] = useState<Vorgang[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"alle" | "offen" | "überfällig" | "eingereicht" | "abgeschlossen">("offen");
  const [copiedId, setCopiedId]   = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);

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

  const overdueCount = vorgaenge.filter(isOverdue).length;

  const filtered = vorgaenge.filter(v => {
    if (filter === "alle")        return true;
    if (filter === "überfällig")  return isOverdue(v);
    return v.status === filter;
  });

  const counts = {
    offen:         vorgaenge.filter(v => v.status === "offen").length,
    überfällig:    overdueCount,
    eingereicht:   vorgaenge.filter(v => v.status === "eingereicht").length,
    abgeschlossen: vorgaenge.filter(v => v.status === "abgeschlossen").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Vorgänge</h1>
            <p className="text-xs text-slate-400 mt-0.5">Dokumentenanfragen & Kunden-Portal</p>
          </div>
          <div className="flex items-center gap-2">
            {counts.eingereicht > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl">
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700">
                  {counts.eingereicht} neu eingereicht
                </span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-700">
                  {overdueCount} überfällig
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {([
            { key: "offen",         label: "Offen",         count: counts.offen },
            { key: "überfällig",    label: "Überfällig",    count: counts.überfällig, danger: true },
            { key: "eingereicht",   label: "Eingereicht",   count: counts.eingereicht },
            { key: "abgeschlossen", label: "Abgeschlossen", count: counts.abgeschlossen },
            { key: "alle",          label: "Alle",          count: vorgaenge.length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.key
                  ? "danger" in tab && tab.danger
                    ? "bg-red-600 text-white"
                    : "bg-slate-900 text-white"
                  : "danger" in tab && tab.danger && tab.count > 0
                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {"danger" in tab && tab.danger && tab.count > 0 && filter !== tab.key && (
                <AlertTriangle className="w-3 h-3" />
              )}
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mb-4 shadow-sm">
              <FolderOpen className="w-7 h-7 text-slate-200" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Keine Vorgänge</p>
            <p className="text-xs text-slate-300 mt-1">
              {filter === "offen" ? "Alle Vorgänge sind erledigt 🎉"
               : filter === "überfällig" ? "Keine überfälligen Vorgänge — alles im grünen Bereich 🎉"
               : "Noch keine Einträge in dieser Kategorie"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {filtered.map(vorgang => {
              const cfg = STATUS_CONFIG[vorgang.status] || STATUS_CONFIG.offen;
              const checklist = parseJSON(vorgang.checklist);
              const files = parseJSON(vorgang.files);
              const completedItems = checklist.filter((i: { completed: boolean }) => i.completed).length;
              const isUpdating  = updatingId === vorgang.id;
              const isReminding = remindingId === vorgang.id;
              const overdue = isOverdue(vorgang);
              const canRemind = vorgang.status === "offen" && !!vorgang.portalSentAt;

              return (
                <div
                  key={vorgang.id}
                  onClick={() => setDrawerContactId(vorgang.contact.id)}
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
        )}
      </div>

      {drawerContactId && (
        <ContactDrawer
          contactId={drawerContactId}
          onClose={() => setDrawerContactId(null)}
          initialTab="vorgaenge"
        />
      )}
    </div>
  );
}
