"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  offen:        { label: "Offen",         color: "rgba(251,191,36,1)",  bg: "rgba(251,191,36,0.1)",  dot: "rgba(251,191,36,1)" },
  teilweise:    { label: "Teilweise",     color: "rgba(251,146,60,1)", bg: "rgba(251,146,60,0.1)", dot: "rgba(251,146,60,1)" },
  eingereicht:  { label: "Eingereicht",   color: "#1B77BA",            bg: "rgba(27,119,186,0.1)", dot: "#1B77BA" },
  abgeschlossen:{ label: "Abgeschlossen", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)", dot: "rgba(255,255,255,0.3)" },
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#FFFFFF",
  padding: "10px 16px",
  fontSize: "14px",
  outline: "none",
  transition: "all 150ms ease",
};

const gradientBorderCard = {
  padding: "1px",
  borderRadius: "12px",
  background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 12px)",
  boxShadow: "rgba(0,0,0,0.1) 0px 20px 25px -5px",
};

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
    { key: "overdue",     label: "Überfällig",           items: groups.overdue,     labelColor: "#EF4444",           dotColor: "#EF4444",          badgeBg: "rgba(239,68,68,0.1)",    badgeColor: "#EF4444" },
    { key: "teilweise",   label: "Teilweise eingereicht", items: groups.teilweise,   labelColor: "rgba(251,146,60,1)", dotColor: "rgba(251,146,60,1)", badgeBg: "rgba(251,146,60,0.1)", badgeColor: "rgba(251,146,60,1)" },
    { key: "eingereicht", label: "Eingereicht",           items: groups.eingereicht, labelColor: "#1B77BA",            dotColor: "#1B77BA",           badgeBg: "rgba(27,119,186,0.1)", badgeColor: "#1B77BA" },
    { key: "offen",       label: "Offen",                 items: groups.offen,       labelColor: "rgba(251,191,36,1)", dotColor: "rgba(251,191,36,1)", badgeBg: "rgba(251,191,36,0.1)", badgeColor: "rgba(251,191,36,1)" },
  ].filter(s => s.items.length > 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: "#111111" }}>
      <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: "#111111" }}>
      <PageHeader
        title="Vorgänge"
        subtitle="Dokumentenanfragen & Kunden-Portal"
        actions={
          <div className="flex items-center gap-2">
            {pendingReviewCount > 0 && (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "rgba(251,191,36,1)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgba(251,191,36,1)" }} />
                {pendingReviewCount} zur Prüfung
              </span>
            )}
            {eingereichtCount > 0 && (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(27,119,186,0.1)", border: "1px solid rgba(27,119,186,0.2)", color: "#1B77BA" }}
              >
                <Icon icon="solar:upload-linear" style={{ width: 14, height: 14 }} />
                {eingereichtCount} eingereicht
              </span>
            )}
            {overdueCount > 0 && (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
              >
                <Icon icon="solar:danger-triangle-linear" style={{ width: 14, height: 14 }} />
                {overdueCount} überfällig
              </span>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 font-semibold text-sm"
              style={{
                background: "#F2EAD3",
                color: "#000000",
                borderRadius: "9999px",
                padding: "8px 20px",
                border: "none",
                transition: "all 150ms ease",
              }}
            >
              <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
              Neuer Vorgang
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {vorgaenge.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Icon icon="solar:folder-open-linear" style={{ color: "rgba(255,255,255,0.15)", width: 32, height: 32 }} />
            </div>
            <p className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Noch keine Vorgänge</p>
            <p className="text-sm mt-1 mb-6" style={{ color: "rgba(255,255,255,0.25)" }}>Erstelle deinen ersten Vorgang um Dokumente anzufordern</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 font-semibold text-sm"
              style={{
                background: "#F2EAD3",
                color: "#000000",
                borderRadius: "9999px",
                padding: "8px 20px",
                border: "none",
                transition: "all 150ms ease",
              }}
            >
              <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
              Neuer Vorgang
            </button>
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Alles erledigt 🎉</p>
              </div>
            )}

            {sections.map(section => (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: section.dotColor }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: section.labelColor }}>{section.label}</p>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: section.badgeBg, color: section.badgeColor }}
                  >
                    {section.items.length}
                  </span>
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
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Abgeschlossen</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                    {groups.abgeschlossen.length}
                  </span>
                  <Icon
                    icon={showAbgeschlossen ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                    style={{ color: "rgba(255,255,255,0.3)", width: 14, height: 14 }}
                  />
                </button>
                {showAbgeschlossen && (
                  <div className="space-y-2" style={{ opacity: 0.6 }}>
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
  const [hovered, setHovered] = useState(false);

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
    fetch(`/api/vorgaenge/${vorgang.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brokerTodos: updated }) }).catch(() => {});
  }

  async function addBrokerTodo() {
    const label = brokerTodoInput.trim();
    if (!label) return;
    const newTodo: BrokerTodo = { id: crypto.randomUUID(), label, completed: false, completedAt: null };
    const updated = [...vorgang.brokerTodos, newTodo];
    onUpdate({ brokerTodos: updated });
    setBrokerTodoInput("");
    fetch(`/api/vorgaenge/${vorgang.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brokerTodos: updated }) }).catch(() => {});
  }

  async function reviewCustomerTodo(todoId: string, action: "confirm" | "reopen") {
    const updated = vorgang.checklist.map(t =>
      t.id === todoId ? { ...t, status: (action === "confirm" ? "done" : "open") as CustomerTodo["status"], completedAt: action === "confirm" ? new Date().toISOString() : null } : t
    );
    onUpdate({ checklist: updated });
    fetch(`/api/vorgaenge/${vorgang.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checklist: updated }) }).catch(() => {});
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
    await fetch(`/api/vorgaenge/${vorgang.id}/broker-upload`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) });
    onUpdate({ brokerFiles: vorgang.brokerFiles.filter(f => f.id !== fileId) });
  }

  const mailSubject = encodeURIComponent(`Unterlagen: ${vorgang.title}`);
  const mailBody    = encodeURIComponent(`Hallo,\n\nbitte laden Sie Ihre Unterlagen hier hoch:\n${portalUrl}\n\nMit freundlichen Grüßen`);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl transition-all"
      style={{
        background: "#1C1C1C",
        border: overdue && !expanded ? "1px solid rgba(239,68,68,0.3)" : expanded ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.08)",
        transition: "all 150ms ease",
      }}
    >
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: overdue ? "#EF4444" : cfg.dot }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "#FFFFFF" }}>{vorgang.title}</p>
          </div>
          <p className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Icon icon="solar:user-linear" style={{ width: 12, height: 12, flexShrink: 0 }} />
            <span className="truncate">{contactName(vorgang.contact)}</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <Icon icon="solar:clock-circle-linear" style={{ width: 12, height: 12, flexShrink: 0 }} />
            <span>{formatDistanceToNow(new Date(vorgang.createdAt), { addSuffix: true, locale: de })}</span>
            {vorgang.lastActivityAt && (
              <>
                <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                <Icon icon="solar:chart-linear" style={{ width: 12, height: 12, flexShrink: 0, color: "#F2EAD3" }} />
                <span style={{ color: "#F2EAD3" }}>{formatDistanceToNow(new Date(vorgang.lastActivityAt), { addSuffix: true, locale: de })}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {pendingReviewCount > 0 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
              style={{ background: "rgba(251,191,36,0.15)", color: "rgba(251,191,36,1)" }}
            >
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "rgba(251,191,36,1)" }} />
              {pendingReviewCount} Prüfung
            </span>
          )}
          {overdue && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>Überfällig</span>
          )}
          {vorgang.files.length > 0 && (
            <span className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""}</span>
          )}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <Icon
            icon={expanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            style={{ color: "rgba(255,255,255,0.3)", width: 16, height: 16 }}
          />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-4 space-y-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>

          {/* Send / Remind actions */}
          {vorgang.status !== "abgeschlossen" && (
            <div className="flex flex-wrap gap-2">
              {!vorgang.portalSentAt ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "#F2EAD3", color: "#000000", opacity: sending ? 0.6 : 1, transition: "all 150ms ease" }}
                >
                  {sending
                    ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
                    : <Icon icon="solar:send-linear" style={{ width: 14, height: 14 }} />}
                  Per WhatsApp / E-Mail senden
                </button>
              ) : (
                <button
                  onClick={handleRemind}
                  disabled={reminding || vorgang.reminderCount >= 2}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)", border: "1px solid rgba(251,191,36,0.2)", opacity: (reminding || vorgang.reminderCount >= 2) ? 0.5 : 1 }}
                >
                  {reminding
                    ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(251,191,36,0.3)", borderTopColor: "rgba(251,191,36,1)" }} />
                    : <Icon icon="solar:bell-linear" style={{ width: 14, height: 14 }} />}
                  Erinnern {vorgang.reminderCount > 0 && `(${vorgang.reminderCount}/2)`}
                </button>
              )}
            </div>
          )}

          {/* Portal link */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Kunden-Portal</p>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <code className="flex-1 text-[11px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{portalUrl}</code>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0"
                style={{ background: copied ? "#F2EAD3" : "rgba(255,255,255,0.08)", color: copied ? "#000000" : "rgba(255,255,255,0.6)" }}
              >
                <Icon icon={copied ? "solar:check-circle-linear" : "solar:copy-linear"} style={{ width: 11, height: 11 }} />
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {vorgang.contact.email && (
                <a
                  href={`mailto:${vorgang.contact.email}?subject=${mailSubject}&body=${mailBody}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: "rgba(27,119,186,0.1)", color: "#1B77BA", border: "1px solid rgba(27,119,186,0.2)" }}
                >
                  <Icon icon="solar:letter-linear" style={{ width: 12, height: 12 }} /> E-Mail
                </a>
              )}
              <a
                href={portalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon icon="solar:link-circle-linear" style={{ width: 12, height: 12 }} /> Vorschau
              </a>
            </div>
            {vorgang.portalSentAt && (
              <p className="text-[10px] flex items-center gap-1 mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                <Icon icon="solar:send-linear" style={{ width: 10, height: 10 }} />
                Gesendet {formatDistanceToNow(new Date(vorgang.portalSentAt), { addSuffix: true, locale: de })}
              </p>
            )}
          </div>

          {/* Broker Todos */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Meine Aufgaben</p>
            {vorgang.brokerTodos.length === 0 && (
              <p className="text-[11px] mb-2 italic" style={{ color: "rgba(255,255,255,0.2)" }}>Keine eigenen Aufgaben</p>
            )}
            {vorgang.brokerTodos.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {vorgang.brokerTodos.map(todo => (
                  <li key={todo.id} className="flex items-center gap-2">
                    <button onClick={() => toggleBrokerTodo(todo.id)} className="flex-shrink-0">
                      {todo.completed
                        ? <Icon icon="solar:check-circle-linear" style={{ color: "#F2EAD3", width: 16, height: 16 }} />
                        : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(255,255,255,0.2)" }} />
                      }
                    </button>
                    <span className="text-xs flex-1" style={{ color: todo.completed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", textDecoration: todo.completed ? "line-through" : "none" }}>
                      {todo.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-1.5">
              <input
                type="text" value={brokerTodoInput} onChange={e => setBrokerTodoInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addBrokerTodo(); }}
                placeholder="Aufgabe hinzufügen..."
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", transition: "all 150ms ease" }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
              <button
                onClick={addBrokerTodo} disabled={!brokerTodoInput.trim()}
                className="px-2 py-1.5 rounded-lg transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", opacity: !brokerTodoInput.trim() ? 0.4 : 1 }}
              >
                <Icon icon="solar:add-circle-linear" style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Customer Todos */}
          {vorgang.checklist.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Kundenaufgaben</p>
                {pendingReviewCount > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.15)", color: "rgba(251,191,36,1)" }}>{pendingReviewCount} zur Prüfung</span>
                )}
              </div>
              <ul className="space-y-2">
                {vorgang.checklist.map(todo => (
                  <li key={todo.id} className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon
                        icon={todo.type === "upload" ? "solar:paperclip-linear" : "solar:checklist-linear"}
                        style={{ color: "rgba(255,255,255,0.3)", width: 14, height: 14 }}
                      />
                    </div>
                    <span
                      className="text-xs flex-1 leading-tight"
                      style={{ color: todo.status === "done" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", textDecoration: todo.status === "done" ? "line-through" : "none" }}
                    >
                      {todo.label}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {todo.status === "open" && <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Offen</span>}
                      {todo.status === "pending_review" && (
                        <>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)" }}>Zur Prüfung</span>
                          <button onClick={() => reviewCustomerTodo(todo.id, "confirm")} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(242,234,211,0.1)", color: "#F2EAD3" }}>✓</button>
                          <button onClick={() => reviewCustomerTodo(todo.id, "reopen")} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>↩</button>
                        </>
                      )}
                      {todo.status === "done" && (
                        <>
                          <Icon icon="solar:check-circle-linear" style={{ color: "#F2EAD3", width: 14, height: 14 }} />
                          <button onClick={() => reviewCustomerTodo(todo.id, "reopen")} className="text-[9px] transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}>↩</button>
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
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                Hochgeladene Dateien ({vorgang.files.length})
              </p>
              <ul className="space-y-1.5">
                {vorgang.files.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Icon icon="solar:file-text-linear" style={{ color: "rgba(255,255,255,0.2)", width: 16, height: 16, flexShrink: 0 }} />
                    <a href={`/api/blob/download?url=${encodeURIComponent(f.url)}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs hover:underline truncate flex-1" style={{ color: "#F2EAD3" }}>{f.name}</a>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Broker files */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Unterlagen für den Kunden</p>
            {vorgang.brokerFiles.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {vorgang.brokerFiles.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Icon icon="solar:file-text-linear" style={{ color: "rgba(255,255,255,0.2)", width: 16, height: 16, flexShrink: 0 }} />
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline truncate flex-1" style={{ color: "#F2EAD3" }}>{f.name}</a>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>{formatBytes(f.size)}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-1 transition-colors flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                      <Icon icon="solar:download-linear" style={{ width: 12, height: 12 }} />
                    </a>
                    <button onClick={() => deleteBrokerFile(f.id)} className="p-1 rounded transition-colors flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                      <Icon icon="solar:trash-bin-linear" style={{ width: 12, height: 12 }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input ref={brokerFileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={handleBrokerFileSelect} />
            <button
              onClick={() => brokerFileRef.current?.click()} disabled={brokerUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)", opacity: brokerUploading ? 0.6 : 1 }}
            >
              {brokerUploading
                ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFFFFF" }} />
                : <Icon icon="solar:upload-linear" style={{ width: 14, height: 14 }} />}
              {brokerUploading ? "Wird hochgeladen..." : "PDF hochladen"}
            </button>
          </div>

          {/* Status + delete */}
          <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                <button
                  key={key} onClick={() => changeStatus(key)} disabled={updatingStatus}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                  style={{
                    background: vorgang.status === key ? s.bg : "transparent",
                    color: vorgang.status === key ? s.color : "rgba(255,255,255,0.3)",
                    border: `1px solid ${vorgang.status === key ? s.color : "rgba(255,255,255,0.1)"}`,
                    opacity: updatingStatus ? 0.6 : 1,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.2)", background: "transparent" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Icon icon="solar:trash-bin-linear" style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Vorgang Flow ────────────────────────────────────────────────────────

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
        style={{ background: "#1C1C1C", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "rgba(0,0,0,0.4) 0px 25px 50px -12px" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h2 className="text-base" style={{ color: "#FFFFFF", fontWeight: 400 }}>Kontakt auswählen</h2>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Für welchen Kunden ist dieser Vorgang?</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="relative">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)", width: 16, height: 16 }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name oder Unternehmen suchen..."
              className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#FFFFFF" }}
              autoFocus
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(255,255,255,0.4)" }}>Keine Kontakte gefunden</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedContact(c); setStep("form"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                style={{ background: "transparent", transition: "all 150ms ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(242,234,211,0.1)" }}
                >
                  <span className="text-xs font-bold" style={{ color: "#F2EAD3" }}>
                    {([c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#FFFFFF" }}>{[c.firstName, c.lastName].filter(Boolean).join(" ") || c.company}</p>
                  {c.company && (c.firstName || c.lastName) && <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{c.company}</p>}
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
    return desc ? desc.trim() : `Hallo {{vorname}},\n\nbitte laden Sie die folgenden Unterlagen für *{{titel}}* hoch.\n\nBei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.`;
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

  const modalStyle: React.CSSProperties = {
    background: "#1C1C1C",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "rgba(0,0,0,0.4) 0px 25px 50px -12px",
    width: "100%",
    maxWidth: "448px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={step === "form" ? () => setStep("template") : onBack}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.4)", background: "transparent" }}
            >
              <Icon icon="solar:arrow-left-linear" style={{ width: 16, height: 16 }} />
            </button>
            <div>
              <h2 className="text-base" style={{ color: "#FFFFFF", fontWeight: 400 }}>{step === "template" ? "Vorlage wählen" : "Vorgang erstellen"}</h2>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {step === "template" ? `Für ${contactDisplayName}` : selectedTemplate ? `${selectedTemplate.name} · ${contactDisplayName}` : `Individuell · ${contactDisplayName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {step === "template" && (
          <div className="p-4 overflow-y-auto flex-1 space-y-2">
            {loadingTpl ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
              </div>
            ) : (
              <>
                <button
                  onClick={() => pickTemplate(null)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all group"
                  style={{ border: "2px dashed rgba(255,255,255,0.1)", background: "transparent", transition: "all 150ms ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(242,234,211,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(242,234,211,0.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: "rgba(255,255,255,0.06)" }}>+</div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>Leer starten</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Eigene Aufgaben erstellen</p>
                  </div>
                </button>
                {templates.map(t => (
                  <button
                    key={t.id} onClick={() => pickTemplate(t)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", background: "transparent", transition: "all 150ms ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: "rgba(255,255,255,0.06)" }}>{CATEGORY_ICON[t.category] || "📁"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>{t.name}</p>
                      {t.checklist && (() => { try { const p = JSON.parse(t.checklist) as Array<{label: string}>; return p.length > 0 ? <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{p.map(i => i.label).join(" · ")}</p> : null; } catch { return null; }})()}
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
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Bezeichnung</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. KFZ-Versicherung VW Golf"
                  style={inputStyle} autoFocus
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Beschreibung für das Portal</label>
                <textarea
                  ref={descRef} value={description} onChange={e => setDescription(e.target.value)} rows={7}
                  style={{ ...inputStyle, resize: "none", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.6" }}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[["{{vorname}}", "Vorname"], ["{{titel}}", "Titel"]].map(([v, label]) => (
                    <button
                      key={v} type="button" onClick={() => insertVar(v)}
                      className="px-2 py-0.5 rounded-lg font-mono text-[11px] transition-colors"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", transition: "all 150ms ease" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(242,234,211,0.1)"; (e.currentTarget as HTMLElement).style.color = "#F2EAD3"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer todos */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Aufgaben für den Kunden</label>
                <div className="flex gap-2 items-start">
                  <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <button
                      type="button" onClick={() => setNewItemType("upload")}
                      className="px-2 py-2 text-xs transition-colors"
                      style={{ background: newItemType === "upload" ? "#F2EAD3" : "transparent", color: newItemType === "upload" ? "#000000" : "rgba(255,255,255,0.4)" }}
                    >
                      <Icon icon="solar:paperclip-linear" style={{ width: 12, height: 12 }} />
                    </button>
                    <button
                      type="button" onClick={() => setNewItemType("task")}
                      className="px-2 py-2 text-xs transition-colors"
                      style={{ background: newItemType === "task" ? "#F2EAD3" : "transparent", color: newItemType === "task" ? "#000000" : "rgba(255,255,255,0.4)" }}
                    >
                      <Icon icon="solar:checklist-linear" style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                  <input
                    type="text" value={checklistInput} onChange={e => setChecklistInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); }}}
                    placeholder={newItemType === "upload" ? "z.B. Personalausweis..." : "z.B. IBAN mitteilen..."}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                  <button
                    onClick={addItem} disabled={!checklistInput.trim()}
                    className="px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: "#F2EAD3", color: "#000000", opacity: !checklistInput.trim() ? 0.4 : 1 }}
                  >
                    <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                {items.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <Icon icon={item.type === "upload" ? "solar:paperclip-linear" : "solar:checklist-linear"} style={{ color: "rgba(255,255,255,0.3)", width: 14, height: 14, flexShrink: 0 }} />
                        <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
                        <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} style={{ color: "rgba(255,255,255,0.3)", background: "transparent" }}>
                          <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Broker todos */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Meine Aufgaben <span className="font-normal normal-case" style={{ color: "rgba(255,255,255,0.2)" }}>(intern)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text" value={brokerTodoInput} onChange={e => setBrokerTodoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (brokerTodoInput.trim()) { setBrokerItems(p => [...p, brokerTodoInput.trim()]); setBrokerTodoInput(""); }}}}
                    placeholder="z.B. Angebot einholen..."
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                  <button
                    onClick={() => { if (brokerTodoInput.trim()) { setBrokerItems(p => [...p, brokerTodoInput.trim()]); setBrokerTodoInput(""); }}}
                    disabled={!brokerTodoInput.trim()}
                    className="px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "#F2EAD3", color: "#000000", opacity: !brokerTodoInput.trim() ? 0.4 : 1 }}
                  >
                    <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                {brokerItems.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {brokerItems.map((label, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.2)" }} />
                        <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</span>
                        <button onClick={() => setBrokerItems(p => p.filter((_, idx) => idx !== i))} style={{ color: "rgba(255,255,255,0.3)", background: "transparent" }}>
                          <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Send now */}
              <div
                className="rounded-xl p-4 transition-all"
                style={{
                  border: `1px solid ${canSendNow && sendNow ? "rgba(242,234,211,0.2)" : "rgba(255,255,255,0.08)"}`,
                  background: canSendNow && sendNow ? "rgba(242,234,211,0.05)" : "rgba(255,255,255,0.03)",
                }}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => canSendNow && setSendNow(s => !s)}
                    className="relative rounded-full transition-all flex-shrink-0"
                    style={{
                      width: 40, height: 22,
                      background: canSendNow && sendNow ? "#F2EAD3" : "rgba(255,255,255,0.1)",
                      opacity: !canSendNow ? 0.4 : 1,
                      cursor: canSendNow ? "pointer" : "not-allowed",
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                      style={{ left: sendNow ? 20 : 2, background: canSendNow && sendNow ? "#1C1C1C" : "#FFFFFF" }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: canSendNow && sendNow ? "#F2EAD3" : "rgba(255,255,255,0.6)" }}>Sofort senden</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {canSendNow ? "Portal-Link wird automatisch verschickt" : "Kein Telefon oder E-Mail hinterlegt"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Abbrechen
              </button>
              <button
                onClick={create} disabled={saving || !title.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "#F2EAD3", color: "#000000", opacity: (saving || !title.trim()) ? 0.5 : 1 }}
              >
                {saving
                  ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
                  : canSendNow && sendNow
                    ? <><Icon icon="solar:send-linear" style={{ width: 16, height: 16 }} /> Erstellen & Senden</>
                    : <><Icon icon="solar:folder-open-linear" style={{ width: 16, height: 16 }} /> Erstellen</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
