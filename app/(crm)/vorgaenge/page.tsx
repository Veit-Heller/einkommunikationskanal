"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen, Clock, CheckCheck, Upload, User, FileText,
  Copy, Check, Loader2, Bell, Send, Activity, AlertTriangle,
  Zap, X, ChevronDown, ChevronUp, Plus, Paperclip, CheckSquare,
  CheckCircle2, Trash2, ExternalLink, MessageCircle, Mail,
  Download, Search,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";
import { contactName } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerTodo {
  id: string; label: string;
  type: "upload" | "task";
  status: "open" | "pending_review" | "done";
  completedAt: string | null; fileId: string | null;
}
interface BrokerTodo {
  id: string; label: string; completed: boolean; completedAt: string | null;
}
interface UploadedFile { id: string; name: string; url: string; size: number; uploadedAt: string; }

interface Vorgang {
  id: string; title: string; description: string | null;
  status: string; token: string; createdAt: string;
  checklist: string; files: string; brokerFiles: string; brokerTodos: string;
  portalSentAt: string | null; lastActivityAt: string | null;
  reminderCount: number;
  contact: {
    id: string; firstName: string | null; lastName: string | null;
    company: string | null; phone: string | null; email: string | null;
  };
}

interface ParsedVorgang extends Omit<Vorgang, "checklist" | "files" | "brokerFiles" | "brokerTodos"> {
  checklist: CustomerTodo[];
  files: UploadedFile[];
  brokerFiles: UploadedFile[];
  brokerTodos: BrokerTodo[];
}

interface ContactOption {
  id: string; firstName: string | null; lastName: string | null;
  company: string | null; phone: string | null; email: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
  offen:        { label: "Offen",         color: "text-amber-700",   bg: "bg-amber-50",   dot: "bg-amber-400",  border: "border-amber-200" },
  teilweise:    { label: "Teilweise",     color: "text-orange-700",  bg: "bg-orange-50",  dot: "bg-orange-400", border: "border-orange-200" },
  eingereicht:  { label: "Eingereicht",   color: "text-blue-700",    bg: "bg-blue-50",    dot: "bg-blue-500",   border: "border-blue-200" },
  abgeschlossen:{ label: "Abgeschlossen", color: "text-slate-500",   bg: "bg-slate-50",   dot: "bg-slate-400",  border: "border-slate-200" },
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s); } catch { return fallback; }
}

function normalizeCustomerTodo(item: Record<string, unknown>): CustomerTodo {
  return {
    id: item.id as string, label: item.label as string,
    type: (item.type as string || "upload") as "upload" | "task",
    status: (item.status as string || (item.completed ? "done" : "open")) as CustomerTodo["status"],
    completedAt: (item.completedAt as string) || null, fileId: (item.fileId as string) || null,
  };
}

function parseVorgang(v: Vorgang): ParsedVorgang {
  return {
    ...v,
    checklist:   (parseJSON<Record<string, unknown>[]>(v.checklist, [])).map(normalizeCustomerTodo),
    files:       parseJSON<UploadedFile[]>(v.files, []),
    brokerFiles: parseJSON<UploadedFile[]>(v.brokerFiles || "[]", []),
    brokerTodos: parseJSON<BrokerTodo[]>(v.brokerTodos || "[]", []),
  };
}

function isOverdue(v: Vorgang | ParsedVorgang): boolean {
  if (v.status !== "offen") return false;
  return Date.now() - new Date(v.createdAt).getTime() > SEVEN_DAYS_MS && !v.lastActivityAt;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function groupVorgaenge(list: ParsedVorgang[]) {
  const overdue: ParsedVorgang[] = [], teilweise: ParsedVorgang[] = [],
        eingereicht: ParsedVorgang[] = [], offen: ParsedVorgang[] = [],
        abgeschlossen: ParsedVorgang[] = [];
  for (const v of list) {
    if (v.status === "abgeschlossen") { abgeschlossen.push(v); continue; }
    if (v.status === "teilweise")     { teilweise.push(v);     continue; }
    if (v.status === "eingereicht")   { eingereicht.push(v);   continue; }
    if (isOverdue(v))                 { overdue.push(v);       continue; }
    offen.push(v);
  }
  const byActivity = (a: ParsedVorgang, b: ParsedVorgang) =>
    new Date(b.lastActivityAt || b.createdAt).getTime() - new Date(a.lastActivityAt || a.createdAt).getTime();
  return {
    overdue: overdue.sort(byActivity), teilweise: teilweise.sort(byActivity),
    eingereicht: eingereicht.sort(byActivity), offen: offen.sort(byActivity),
    abgeschlossen: abgeschlossen.sort(byActivity),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VorgaengePage() {
  const [vorgaenge, setVorgaenge]       = useState<ParsedVorgang[]>([]);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({});
  const [showAbgeschlossen, setShowAbgeschlossen] = useState(false);
  const [showCreate, setShowCreate]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vorgaenge");
      const data = await res.json();
      setVorgaenge((data.vorgaenge || []).map(parseVorgang));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateVorgang(id: string, patch: Partial<ParsedVorgang>) {
    setVorgaenge(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
  }

  const groups = groupVorgaenge(vorgaenge);
  const pendingReviewCount = vorgaenge.reduce((n, v) => n + v.checklist.filter(t => t.status === "pending_review").length, 0);
  const eingereichtCount = groups.eingereicht.length;
  const overdueCount = groups.overdue.length;

  const sections = [
    { key: "overdue",     label: "Überfällig",           items: groups.overdue,     labelColor: "text-red-600",    dotColor: "bg-red-500",    badgeBg: "bg-red-50 text-red-600 border-red-100" },
    { key: "teilweise",   label: "Teilweise eingereicht", items: groups.teilweise,   labelColor: "text-orange-700", dotColor: "bg-orange-400", badgeBg: "bg-orange-50 text-orange-700 border-orange-100" },
    { key: "eingereicht", label: "Eingereicht",           items: groups.eingereicht, labelColor: "text-blue-700",   dotColor: "bg-blue-500",   badgeBg: "bg-blue-50 text-blue-700 border-blue-100" },
    { key: "offen",       label: "Offen",                 items: groups.offen,       labelColor: "text-amber-700",  dotColor: "bg-amber-400",  badgeBg: "bg-amber-50 text-amber-700 border-amber-100" },
  ].filter(s => s.items.length > 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Vorgänge"
        subtitle="Dokumentenanfragen & Kunden-Portal"
        actions={
          <div className="flex items-center gap-2">
            {pendingReviewCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {pendingReviewCount} zur Prüfung
              </span>
            )}
            {eingereichtCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700">
                <Upload className="w-3.5 h-3.5" />
                {eingereichtCount} eingereicht
              </span>
            )}
            {overdueCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overdueCount} überfällig
              </span>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-lime-500 text-white rounded-xl text-xs font-semibold hover:bg-lime-600 transition-colors shadow-sm shadow-lime-500/25"
            >
              <Plus className="w-4 h-4" />
              Neuer Vorgang
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {vorgaenge.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mb-4 shadow-sm">
              <FolderOpen className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-base font-semibold text-slate-400">Noch keine Vorgänge</p>
            <p className="text-sm text-slate-300 mt-1 mb-6">Erstelle deinen ersten Vorgang um Dokumente anzufordern</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-lime-500 text-white rounded-xl text-sm font-semibold hover:bg-lime-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neuer Vorgang
            </button>
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-slate-400">Alles erledigt 🎉</p>
              </div>
            )}

            {sections.map(section => (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${section.dotColor}`} />
                  <p className={`text-xs font-bold uppercase tracking-widest ${section.labelColor}`}>{section.label}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${section.badgeBg}`}>{section.items.length}</span>
                </div>
                <div className="space-y-2">
                  {section.items.map(v => (
                    <VorgangCard
                      key={v.id}
                      vorgang={v}
                      expanded={!!expanded[v.id]}
                      onToggle={() => setExpanded(e => ({ ...e, [v.id]: !e[v.id] }))}
                      onUpdate={(patch) => updateVorgang(v.id, patch)}
                      onDelete={() => setVorgaenge(prev => prev.filter(x => x.id !== v.id))}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Abgeschlossen */}
            {groups.abgeschlossen.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAbgeschlossen(s => !s)}
                  className="flex items-center gap-2 mb-3 group"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">Abgeschlossen</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-400 border-slate-200">{groups.abgeschlossen.length}</span>
                  {showAbgeschlossen ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
                </button>
                {showAbgeschlossen && (
                  <div className="space-y-2 opacity-60">
                    {groups.abgeschlossen.map(v => (
                      <VorgangCard
                        key={v.id}
                        vorgang={v}
                        expanded={!!expanded[v.id]}
                        onToggle={() => setExpanded(e => ({ ...e, [v.id]: !e[v.id] }))}
                        onUpdate={(patch) => updateVorgang(v.id, patch)}
                        onDelete={() => setVorgaenge(prev => prev.filter(x => x.id !== v.id))}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateVorgangFlow
          onClose={() => setShowCreate(false)}
          onCreated={(v) => {
            setVorgaenge(prev => [parseVorgang(v as unknown as Vorgang), ...prev]);
            setShowCreate(false);
            setExpanded(e => ({ ...e, [v.id]: true }));
          }}
        />
      )}
    </div>
  );
}

// ── Vorgang Card ──────────────────────────────────────────────────────────────

function VorgangCard({ vorgang, expanded, onToggle, onUpdate, onDelete }: {
  vorgang: ParsedVorgang;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<ParsedVorgang>) => void;
  onDelete: () => void;
}) {
  const [copied, setCopied]           = useState(false);
  const [sending, setSending]         = useState(false);
  const [reminding, setReminding]     = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [brokerUploading, setBrokerUploading] = useState(false);
  const [brokerTodoInput, setBrokerTodoInput] = useState("");
  const brokerFileRef = useRef<HTMLInputElement>(null);

  const cfg = STATUS_CONFIG[vorgang.status] || STATUS_CONFIG.offen;
  const overdue = isOverdue(vorgang);
  const pendingReviewCount = vorgang.checklist.filter(t => t.status === "pending_review").length;
  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal/${vorgang.token}` : `/portal/${vorgang.token}`;

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onUpdate({ portalSentAt: data.portalSentAt });
    } finally { setSending(false); }
  }

  async function handleRemind() {
    setReminding(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/remind`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onUpdate({ reminderCount: data.reminderCount, lastReminderAt: data.lastReminderAt } as Partial<ParsedVorgang>);
    } finally { setReminding(false); }
  }

  async function changeStatus(status: string) {
    setUpdatingStatus(true);
    try {
      await fetch(`/api/vorgaenge/${vorgang.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onUpdate({ status });
    } finally { setUpdatingStatus(false); }
  }

  async function handleDelete() {
    if (!confirm("Vorgang wirklich löschen?")) return;
    await fetch(`/api/vorgaenge/${vorgang.id}`, { method: "DELETE" });
    onDelete();
  }

  async function toggleBrokerTodo(todoId: string) {
    const updated = vorgang.brokerTodos.map(t =>
      t.id === todoId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
    );
    onUpdate({ brokerTodos: updated });
    fetch(`/api/vorgaenge/${vorgang.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerTodos: updated }),
    }).catch(() => {});
  }

  async function addBrokerTodo() {
    const label = brokerTodoInput.trim();
    if (!label) return;
    const newTodo: BrokerTodo = { id: crypto.randomUUID(), label, completed: false, completedAt: null };
    const updated = [...vorgang.brokerTodos, newTodo];
    onUpdate({ brokerTodos: updated });
    setBrokerTodoInput("");
    fetch(`/api/vorgaenge/${vorgang.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerTodos: updated }),
    }).catch(() => {});
  }

  async function reviewCustomerTodo(todoId: string, action: "confirm" | "reopen") {
    const updated = vorgang.checklist.map(t =>
      t.id === todoId ? { ...t, status: (action === "confirm" ? "done" : "open") as CustomerTodo["status"], completedAt: action === "confirm" ? new Date().toISOString() : null } : t
    );
    onUpdate({ checklist: updated });
    fetch(`/api/vorgaenge/${vorgang.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: updated }),
    }).catch(() => {});
  }

  async function handleBrokerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBrokerUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/broker-upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) onUpdate({ brokerFiles: [...vorgang.brokerFiles, data.file] });
    } finally {
      setBrokerUploading(false);
      if (brokerFileRef.current) brokerFileRef.current.value = "";
    }
  }

  async function deleteBrokerFile(fileId: string) {
    await fetch(`/api/vorgaenge/${vorgang.id}/broker-upload`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    onUpdate({ brokerFiles: vorgang.brokerFiles.filter(f => f.id !== fileId) });
  }

  const whatsappMsg = encodeURIComponent(`Hallo, hier ist Ihr Upload-Link für ${vorgang.title}:\n${portalUrl}`);
  const mailSubject = encodeURIComponent(`Unterlagen: ${vorgang.title}`);
  const mailBody    = encodeURIComponent(`Hallo,\n\nbitte laden Sie Ihre Unterlagen hier hoch:\n${portalUrl}\n\nMit freundlichen Grüßen`);

  return (
    <div className={`bg-white rounded-2xl border transition-all ${
      overdue && !expanded ? "border-red-200" :
      expanded ? "border-slate-200 shadow-md" : "border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
    }`}>
      {/* ── Collapsed header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${overdue ? "bg-red-500" : cfg.dot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">{vorgang.title}</p>
          </div>
          <p className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{contactName(vorgang.contact)}</span>
            <span className="text-slate-200">·</span>
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{formatDistanceToNow(new Date(vorgang.createdAt), { addSuffix: true, locale: de })}</span>
            {vorgang.lastActivityAt && (
              <>
                <span className="text-slate-200">·</span>
                <Activity className="w-3 h-3 flex-shrink-0 text-lime-500" />
                <span className="text-lime-600">{formatDistanceToNow(new Date(vorgang.lastActivityAt), { addSuffix: true, locale: de })}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {pendingReviewCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
              {pendingReviewCount} Prüfung
            </span>
          )}
          {overdue && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full">Überfällig</span>
          )}
          {vorgang.files.length > 0 && (
            <span className="text-[9px] text-slate-400 font-medium">{vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""}</span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            {cfg.label}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
        </div>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-4 space-y-5">

          {/* Send / Remind actions */}
          {vorgang.status !== "abgeschlossen" && (
            <div className="flex flex-wrap gap-2">
              {!vorgang.portalSentAt ? (
                <button onClick={handleSend} disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-lime-500 text-white rounded-xl text-xs font-semibold hover:bg-lime-600 disabled:opacity-60 transition-all shadow-sm shadow-lime-500/20">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Per WhatsApp / E-Mail senden
                </button>
              ) : (
                <button onClick={handleRemind} disabled={reminding || vorgang.reminderCount >= 2}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 transition-all">
                  {reminding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Erinnern {vorgang.reminderCount > 0 && `(${vorgang.reminderCount}/2)`}
                </button>
              )}
            </div>
          )}

          {/* Portal link */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kunden-Portal</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
              <code className="flex-1 text-[11px] text-slate-500 truncate">{portalUrl}</code>
              <button onClick={copyLink}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0 ${
                  copied ? "bg-lime-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {vorgang.contact.phone && (
                <a href={`https://wa.me/${vorgang.contact.phone.replace(/[^0-9]/g, "")}?text=${whatsappMsg}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100">
                  <MessageCircle size={12} /> WhatsApp
                </a>
              )}
              {vorgang.contact.email && (
                <a href={`mailto:${vorgang.contact.email}?subject=${mailSubject}&body=${mailBody}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-xl text-xs font-semibold hover:bg-sky-100 transition-colors border border-sky-100">
                  <Mail size={12} /> E-Mail
                </a>
              )}
              <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors border border-slate-200">
                <ExternalLink size={12} /> Vorschau
              </a>
            </div>
            {vorgang.portalSentAt && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1.5">
                <Send className="w-2.5 h-2.5" />
                Gesendet {formatDistanceToNow(new Date(vorgang.portalSentAt), { addSuffix: true, locale: de })}
              </p>
            )}
          </div>

          {/* Broker Todos — Meine Aufgaben */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Meine Aufgaben</p>
            {vorgang.brokerTodos.length === 0 && (
              <p className="text-[11px] text-slate-300 mb-2 italic">Keine eigenen Aufgaben</p>
            )}
            {vorgang.brokerTodos.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {vorgang.brokerTodos.map(todo => (
                  <li key={todo.id} className="flex items-center gap-2">
                    <button onClick={() => toggleBrokerTodo(todo.id)} className="flex-shrink-0">
                      {todo.completed
                        ? <CheckCircle2 className="w-4 h-4 text-lime-500" />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-300 hover:border-lime-400 transition-colors" />
                      }
                    </button>
                    <span className={`text-xs flex-1 ${todo.completed ? "line-through text-slate-300" : "text-slate-600"}`}>{todo.label}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-1.5">
              <input
                type="text" value={brokerTodoInput} onChange={e => setBrokerTodoInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addBrokerTodo(); }}
                placeholder="Aufgabe hinzufügen..."
                className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-lime-400 bg-slate-50"
              />
              <button onClick={addBrokerTodo} disabled={!brokerTodoInput.trim()}
                className="px-2 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-lime-100 hover:text-lime-700 disabled:opacity-40 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Customer Todos — Kundenaufgaben */}
          {vorgang.checklist.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kundenaufgaben</p>
                {pendingReviewCount > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{pendingReviewCount} zur Prüfung</span>
                )}
              </div>
              <ul className="space-y-2">
                {vorgang.checklist.map(todo => (
                  <li key={todo.id} className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">
                      {todo.type === "upload"
                        ? <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        : <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      }
                    </div>
                    <span className={`text-xs flex-1 leading-tight ${todo.status === "done" ? "line-through text-slate-300" : "text-slate-600"}`}>
                      {todo.label}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {todo.status === "open" && <span className="text-[9px] text-slate-400">Offen</span>}
                      {todo.status === "pending_review" && (
                        <>
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Zur Prüfung</span>
                          <button onClick={() => reviewCustomerTodo(todo.id, "confirm")}
                            className="text-[9px] font-bold px-1.5 py-0.5 bg-lime-100 text-lime-700 rounded-full hover:bg-lime-200 transition-colors">✓</button>
                          <button onClick={() => reviewCustomerTodo(todo.id, "reopen")}
                            className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">↩</button>
                        </>
                      )}
                      {todo.status === "done" && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-lime-500" />
                          <button onClick={() => reviewCustomerTodo(todo.id, "reopen")}
                            className="text-[9px] text-slate-300 hover:text-slate-500 transition-colors" title="Zurücksetzen">↩</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Customer uploaded files */}
          {vorgang.files.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Hochgeladene Dateien ({vorgang.files.length})
              </p>
              <ul className="space-y-1.5">
                {vorgang.files.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <a href={`/api/blob/download?url=${encodeURIComponent(f.url)}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-lime-600 hover:underline truncate flex-1">{f.name}</a>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Broker files */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Unterlagen für den Kunden</p>
            {vorgang.brokerFiles.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {vorgang.brokerFiles.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-lime-600 hover:underline truncate flex-1">{f.name}</a>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      className="p-1 text-slate-300 hover:text-lime-500 transition-colors flex-shrink-0"><Download size={12} /></a>
                    <button onClick={() => deleteBrokerFile(f.id)}
                      className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0"><Trash2 size={12} /></button>
                  </li>
                ))}
              </ul>
            )}
            <input ref={brokerFileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={handleBrokerFileSelect} />
            <button onClick={() => brokerFileRef.current?.click()} disabled={brokerUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700 disabled:opacity-60 transition-all">
              {brokerUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {brokerUploading ? "Wird hochgeladen..." : "PDF hochladen"}
            </button>
          </div>

          {/* Status + delete */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                <button key={key} onClick={() => changeStatus(key)} disabled={updatingStatus}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border disabled:opacity-60 ${
                    vorgang.status === key
                      ? `${s.bg} ${s.color} ${s.border}`
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={handleDelete}
              className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Vorgang Flow (contact picker + form) ────────────────────────────────

function CreateVorgangFlow({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (v: ParsedVorgang) => void;
}) {
  const [step, setStep] = useState<"contact" | "form">("contact");
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [contacts, setContacts]     = useState<ContactOption[]>([]);
  const [search, setSearch]         = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    fetch("/api/contacts?limit=500")
      .then(r => r.json())
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, []);

  const filtered = contacts.filter(c => {
    const name = [c.firstName, c.lastName, c.company].filter(Boolean).join(" ").toLowerCase();
    return name.includes(search.toLowerCase());
  }).slice(0, 20);

  if (step === "form" && selectedContact) {
    return (
      <CreateVorgangModal
        contact={selectedContact}
        onClose={onClose}
        onCreated={onCreated}
        onBack={() => setStep("contact")}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Kontakt auswählen</h2>
            <p className="text-xs text-slate-400">Für welchen Kunden ist dieser Vorgang?</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name oder Unternehmen suchen..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Keine Kontakte gefunden</p>
          ) : (
            filtered.map(c => (
              <button key={c.id} onClick={() => { setSelectedContact(c); setStep("form"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-lime-700">
                    {([c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{[c.firstName, c.lastName].filter(Boolean).join(" ") || c.company}</p>
                  {c.company && (c.firstName || c.lastName) && <p className="text-xs text-slate-400">{c.company}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Vorgang Modal ───────────────────────────────────────────────────────

function CreateVorgangModal({ contact, onClose, onCreated, onBack }: {
  contact: ContactOption;
  onClose: () => void;
  onCreated: (v: ParsedVorgang) => void;
  onBack: () => void;
}) {
  interface VorgangTemplate { id: string; name: string; category: string; description: string | null; checklist: string; }
  const CATEGORY_ICON: Record<string, string> = { schaden: "🚗", neuvertrag: "📄", service: "🛡️", sonstiges: "📁" };

  const [templates, setTemplates]   = useState<VorgangTemplate[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [step, setStep]             = useState<"template" | "form">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<VorgangTemplate | null>(null);

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems]           = useState<Array<{label: string; type: "upload" | "task"}>>([]);
  const [brokerItems, setBrokerItems] = useState<string[]>([]);
  const [checklistInput, setChecklistInput] = useState("");
  const [newItemType, setNewItemType] = useState<"upload" | "task">("upload");
  const [brokerTodoInput, setBrokerTodoInput] = useState("");
  const [sendNow, setSendNow]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/vorgang-templates").then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {}).finally(() => setLoadingTpl(false));
  }, []);

  function buildDefaultMessage(desc?: string): string {
    return [`Hallo {{vorname}},`, ``, `für *{{titel}}* habe ich einen sicheren Upload-Link für Sie eingerichtet.`, desc ? `\n${desc}` : ``, `Bitte laden Sie die benötigten Unterlagen hier hoch:`, `{{portalLink}}`, ``, `Bei Fragen stehe ich jederzeit zur Verfügung.`, ``, `{{maklername}}`].join("\n");
  }

  function pickTemplate(t: VorgangTemplate | null) {
    setSelectedTemplate(t);
    if (t) {
      setTitle(t.name);
      setDescription(buildDefaultMessage(t.description || undefined));
      try { const p = JSON.parse(t.checklist) as Array<{label: string; type?: string}>; setItems(p.map(i => ({ label: i.label, type: (i.type as "upload" | "task") || "upload" }))); } catch { setItems([]); }
    } else { setTitle(""); setDescription(buildDefaultMessage()); setItems([]); }
    setStep("form");
  }

  function insertVar(v: string) {
    const ta = descRef.current;
    if (!ta) { setDescription(p => p + v); return; }
    const s = ta.selectionStart ?? description.length, e = ta.selectionEnd ?? description.length;
    setDescription(description.slice(0, s) + v + description.slice(e));
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + v.length, s + v.length); });
  }

  function addItem() { const val = checklistInput.trim(); if (!val) return; setItems(p => [...p, { label: val, type: newItemType }]); setChecklistInput(""); }

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vorgaenge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id, title, description, customerTodos: items, brokerTodos: brokerItems, templateId: selectedTemplate?.id || null, sendNow: !!(contact.phone || contact.email) && sendNow }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data.vorgang);
    } finally { setSaving(false); }
  }

  const canSendNow = !!(contact.phone || contact.email);
  const contactDisplayName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.company || "Unbekannt";

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={step === "form" ? () => setStep("template") : onBack}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">{step === "template" ? "Vorlage wählen" : "Vorgang erstellen"}</h2>
              <p className="text-xs text-slate-400">
                {step === "template" ? `Für ${contactDisplayName}` : selectedTemplate ? `${selectedTemplate.name} · ${contactDisplayName}` : `Individuell · ${contactDisplayName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        {step === "template" && (
          <div className="p-4 overflow-y-auto flex-1 space-y-2">
            {loadingTpl ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div> : (
              <>
                <button onClick={() => pickTemplate(null)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-lime-400 hover:bg-lime-50 transition-all group text-left">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-lime-100 flex items-center justify-center flex-shrink-0 text-lg">+</div>
                  <div><p className="text-sm font-semibold text-slate-700 group-hover:text-lime-700">Leer starten</p><p className="text-xs text-slate-400">Eigene Aufgaben erstellen</p></div>
                </button>
                {templates.map(t => (
                  <button key={t.id} onClick={() => pickTemplate(t)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-lg">{CATEGORY_ICON[t.category] || "📁"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                      {t.checklist && (() => { try { const p = JSON.parse(t.checklist) as Array<{label: string}>; return p.length > 0 ? <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.map(i => i.label).join(" · ")}</p> : null; } catch { return null; }})()}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {step === "form" && (
          <>
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bezeichnung</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. KFZ-Versicherung VW Golf"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20"
                  autoFocus />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nachricht an Kunden</label>
                <textarea ref={descRef} value={description} onChange={e => setDescription(e.target.value)} rows={7}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20 resize-none font-mono leading-relaxed" />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[["{{vorname}}", "Vorname"], ["{{portalLink}}", "Link"], ["{{titel}}", "Titel"], ["{{maklername}}", "Name"]].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => insertVar(v)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-mono hover:bg-lime-100 hover:text-lime-700 transition-colors border border-slate-200">
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer todos */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Aufgaben für den Kunden</label>
                <div className="flex gap-2 items-start">
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                    <button type="button" onClick={() => setNewItemType("upload")}
                      className={`px-2 py-2 text-xs transition-colors ${newItemType === "upload" ? "bg-lime-500 text-white" : "text-slate-400 hover:bg-slate-50"}`} title="Dokument hochladen">
                      <Paperclip className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => setNewItemType("task")}
                      className={`px-2 py-2 text-xs transition-colors ${newItemType === "task" ? "bg-lime-500 text-white" : "text-slate-400 hover:bg-slate-50"}`} title="Aufgabe erledigen">
                      <CheckSquare className="w-3 h-3" />
                    </button>
                  </div>
                  <input type="text" value={checklistInput} onChange={e => setChecklistInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); }}}
                    placeholder={newItemType === "upload" ? "z.B. Personalausweis..." : "z.B. IBAN mitteilen..."}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20" />
                  <button onClick={addItem} disabled={!checklistInput.trim()}
                    className="px-3 py-2 bg-lime-500 text-white rounded-xl text-sm font-semibold hover:bg-lime-600 disabled:opacity-40 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {items.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                        {item.type === "upload" ? <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <CheckSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                        <span className="flex-1 text-sm text-slate-700">{item.label}</span>
                        <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Broker todos */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Meine Aufgaben <span className="font-normal normal-case text-slate-300">(intern)</span></label>
                <div className="flex gap-2">
                  <input type="text" value={brokerTodoInput} onChange={e => setBrokerTodoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (brokerTodoInput.trim()) { setBrokerItems(p => [...p, brokerTodoInput.trim()]); setBrokerTodoInput(""); }}}}
                    placeholder="z.B. Angebot einholen..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20" />
                  <button onClick={() => { if (brokerTodoInput.trim()) { setBrokerItems(p => [...p, brokerTodoInput.trim()]); setBrokerTodoInput(""); }}}
                    disabled={!brokerTodoInput.trim()}
                    className="px-3 py-2 bg-lime-500 text-white rounded-xl text-sm font-semibold hover:bg-lime-600 disabled:opacity-40 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {brokerItems.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {brokerItems.map((label, i) => (
                      <li key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        <span className="flex-1 text-sm text-slate-700">{label}</span>
                        <button onClick={() => setBrokerItems(p => p.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Send now */}
              <div className={`rounded-xl border p-4 transition-all ${canSendNow && sendNow ? "border-lime-200 bg-lime-50" : "border-slate-200 bg-slate-50"}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => canSendNow && setSendNow(s => !s)}
                    className={`relative rounded-full transition-all flex-shrink-0 ${canSendNow && sendNow ? "bg-lime-500" : "bg-slate-200"} ${!canSendNow ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    style={{ width: 40, height: 22 }}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${sendNow ? "left-5" : "left-0.5"}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${canSendNow && sendNow ? "text-lime-800" : "text-slate-600"}`}>Sofort senden</p>
                    <p className="text-xs text-slate-400 mt-0.5">{canSendNow ? "Portal-Link wird automatisch verschickt" : "Kein Telefon oder E-Mail hinterlegt"}</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0">
              <button onClick={onClose}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Abbrechen
              </button>
              <button onClick={create} disabled={saving || !title.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-lime-500 hover:bg-lime-600 disabled:opacity-50 transition-colors">
                {saving
                  ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : canSendNow && sendNow
                    ? <><Send className="w-4 h-4" /> Erstellen & Senden</>
                    : <><FolderOpen className="w-4 h-4" /> Erstellen</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
