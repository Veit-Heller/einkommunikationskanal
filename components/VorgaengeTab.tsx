"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface CustomerTodo {
  id: string;
  label: string;
  type: "upload" | "task";
  status: "open" | "pending_review" | "done";
  completedAt: string | null;
  fileId: string | null;
}

interface BrokerTodo {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

interface UploadedFile  { id: string; name: string; url: string; size: number; uploadedAt: string; }

interface Vorgang {
  id: string;
  title: string;
  description: string | null;
  checklist: CustomerTodo[];
  brokerTodos: BrokerTodo[];
  files: UploadedFile[];
  brokerFiles: UploadedFile[];
  token: string;
  status: string;
  createdAt: string;
  portalSentAt: string | null;
  lastActivityAt: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  contact: { id: string; firstName: string | null; lastName: string | null; phone: string | null; email: string | null };
}

interface VorgangTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  checklist: string;
}

function normalizeCustomerTodo(item: Record<string, unknown>): CustomerTodo {
  return {
    id: item.id as string,
    label: item.label as string,
    type: (item.type as "upload" | "task") || "upload",
    status: (item.status as "open" | "pending_review" | "done") || ((item.completed as boolean) ? "done" : "open"),
    completedAt: (item.completedAt as string) || null,
    fileId: (item.fileId as string) || null,
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; iconName: string }> = {
  offen:         { label: "Offen",         color: "rgba(255,255,255,0.5)",   bg: "rgba(255,255,255,0.08)",  iconName: "solar:clock-circle-linear" },
  teilweise:     { label: "Teilweise",     color: "rgba(251,146,60,1)",      bg: "rgba(251,146,60,0.1)",    iconName: "solar:danger-triangle-linear" },
  eingereicht:   { label: "Eingereicht",   color: "rgba(251,191,36,1)",      bg: "rgba(251,191,36,0.1)",    iconName: "solar:danger-triangle-linear" },
  abgeschlossen: { label: "Abgeschlossen", color: "rgba(52,211,153,1)",      bg: "rgba(52,211,153,0.1)",    iconName: "solar:check-circle-linear" },
};

const CATEGORY_ICON: Record<string, string> = {
  schaden:    "solar:car-linear",
  neuvertrag: "solar:document-check-linear",
  service:    "solar:shield-linear",
  sonstiges:  "solar:folder-open-linear",
};

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  schaden:    { color: "rgba(239,68,68,0.9)",    bg: "rgba(239,68,68,0.08)",    border: "rgba(239,68,68,0.2)" },
  neuvertrag: { color: "rgba(96,165,250,1)",     bg: "rgba(59,130,246,0.08)",   border: "rgba(59,130,246,0.2)" },
  service:    { color: "rgba(167,139,250,1)",    bg: "rgba(139,92,246,0.08)",   border: "rgba(139,92,246,0.2)" },
  sonstiges:  { color: "rgba(255,255,255,0.5)",  bg: "rgba(255,255,255,0.06)",  border: "rgba(255,255,255,0.1)" },
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

interface ContactInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "rgba(255,255,255,0.25)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "7px 12px",
  fontSize: 12,
  color: "#FFFFFF",
  outline: "none",
  transition: "border-color 150ms ease",
  width: "100%",
};

export default function VorgaengeTab({ contact, openVorgangId }: { contact: ContactInfo; openVorgangId?: string }) {
  const [vorgaenge, setVorgaenge]   = useState<Vorgang[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded]     = useState<Record<string, boolean>>(
    openVorgangId ? { [openVorgangId]: true } : {}
  );

  useEffect(() => {
    fetch(`/api/vorgaenge?contactId=${contact.id}`)
      .then(r => r.json())
      .then(d => {
        setVorgaenge((d.vorgaenge || []).map((v: Vorgang & { checklist: string; files: string; brokerFiles: string; brokerTodos: string }) => ({
          ...v,
          checklist:   (JSON.parse(v.checklist || "[]") as Record<string, unknown>[]).map(normalizeCustomerTodo),
          files:       typeof v.files       === "string" ? JSON.parse(v.files)       : v.files,
          brokerFiles: typeof v.brokerFiles === "string" ? JSON.parse(v.brokerFiles) : (v.brokerFiles || []),
          brokerTodos: typeof v.brokerTodos === "string" ? JSON.parse(v.brokerTodos || "[]") : (v.brokerTodos || []),
          portalSentAt:   v.portalSentAt   || null,
          lastActivityAt: v.lastActivityAt || null,
          lastReminderAt: v.lastReminderAt || null,
          reminderCount:  v.reminderCount  ?? 0,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contact.id]);

  async function deleteVorgang(id: string) {
    if (!confirm("Vorgang wirklich löschen?")) return;
    await fetch(`/api/vorgaenge/${id}`, { method: "DELETE" });
    setVorgaenge(prev => prev.filter(v => v.id !== id));
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/vorgaenge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setVorgaenge(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  }

  function updateVorgang(id: string, patch: Partial<Vorgang>) {
    setVorgaenge(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowCreate(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
        style={{
          border: "2px dashed rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.35)",
          background: "transparent",
          transition: "all 150ms ease",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(242,234,211,0.4)";
          (e.currentTarget as HTMLElement).style.color = "#F2EAD3";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)";
        }}
      >
        <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
        Neuen Vorgang erstellen
      </button>

      {vorgaenge.length === 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Icon icon="solar:folder-open-linear" style={{ color: "rgba(255,255,255,0.15)", width: 24, height: 24 }} />
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Noch keine Vorgänge</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>Erstelle einen Vorgang um Dokumente anzufordern</p>
        </div>
      )}

      {vorgaenge.map(v => {
        const portalUrl = typeof window !== "undefined"
          ? `${window.location.origin}/portal/${v.token}`
          : `/portal/${v.token}`;
        return (
          <VorgangCard
            key={v.id}
            vorgang={v}
            expanded={!!expanded[v.id]}
            portalUrl={portalUrl}
            contact={contact}
            onToggle={() => setExpanded(e => ({ ...e, [v.id]: !e[v.id] }))}
            onDelete={() => deleteVorgang(v.id)}
            onStatusChange={s => updateStatus(v.id, s)}
            onUpdate={patch => updateVorgang(v.id, patch)}
          />
        );
      })}

      {showCreate && (
        <CreateVorgangModal
          contactId={contact.id}
          contact={contact}
          onClose={() => setShowCreate(false)}
          onCreated={v => {
            const parsed = {
              ...v,
              checklist: typeof v.checklist === "string"
                ? (JSON.parse(v.checklist) as Record<string, unknown>[]).map(normalizeCustomerTodo)
                : (v.checklist || []),
              files:       typeof v.files       === "string" ? JSON.parse(v.files) : v.files,
              brokerFiles: typeof (v as unknown as { brokerFiles: string }).brokerFiles === "string"
                ? JSON.parse((v as unknown as { brokerFiles: string }).brokerFiles)
                : ((v as unknown as { brokerFiles: UploadedFile[] }).brokerFiles || []),
              brokerTodos: typeof (v as unknown as { brokerTodos: string }).brokerTodos === "string"
                ? JSON.parse((v as unknown as { brokerTodos: string }).brokerTodos || "[]")
                : ((v as unknown as { brokerTodos: BrokerTodo[] }).brokerTodos || []),
              portalSentAt:   v.portalSentAt   || null,
              lastActivityAt: v.lastActivityAt || null,
              lastReminderAt: v.lastReminderAt || null,
              reminderCount:  v.reminderCount  ?? 0,
            };
            setVorgaenge(prev => [parsed, ...prev]);
            setShowCreate(false);
            setExpanded(e => ({ ...e, [v.id]: true }));
          }}
        />
      )}
    </div>
  );
}

// ── Vorgang Card ──────────────────────────────────────────────────────────────

function VorgangCard({
  vorgang, expanded, portalUrl, contact, onToggle, onDelete, onStatusChange, onUpdate,
}: {
  vorgang: Vorgang;
  expanded: boolean;
  portalUrl: string;
  contact: ContactInfo;
  onToggle: () => void;
  onDelete: () => void;
  onStatusChange: (s: string) => void;
  onUpdate: (patch: Partial<Vorgang>) => void;
}) {
  const [copied, setCopied]               = useState(false);
  const [sending, setSending]             = useState(false);
  const [reminding, setReminding]         = useState(false);
  const [brokerUploading, setBrokerUploading] = useState(false);
  const [brokerUploadError, setBrokerUploadError] = useState<string | null>(null);
  const brokerFileInputRef = useRef<HTMLInputElement>(null);
  const st = STATUS_CONFIG[vorgang.status] || STATUS_CONFIG.offen;
  const pendingReviewCount = vorgang.checklist.filter(t => t.status === "pending_review").length;

  async function handleBrokerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrokerUploading(true);
    setBrokerUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/broker-upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      onUpdate({ brokerFiles: [...(vorgang.brokerFiles || []), data.file] });
    } catch (err) {
      setBrokerUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setBrokerUploading(false);
      if (brokerFileInputRef.current) brokerFileInputRef.current.value = "";
    }
  }

  async function handleBrokerFileDelete(fileId: string) {
    try {
      await fetch(`/api/vorgaenge/${vorgang.id}/broker-upload`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      onUpdate({ brokerFiles: (vorgang.brokerFiles || []).filter(f => f.id !== fileId) });
    } catch { /* ignore */ }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendLink() {
    setSending(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onUpdate({ portalSentAt: data.portalSentAt });
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  async function handleRemind() {
    setReminding(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/remind`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onUpdate({ reminderCount: data.reminderCount, lastReminderAt: data.lastReminderAt });
    } catch { /* ignore */ }
    finally { setReminding(false); }
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

  async function addBrokerTodo(label: string) {
    const newTodo: BrokerTodo = { id: crypto.randomUUID(), label, completed: false, completedAt: null };
    const updated = [...vorgang.brokerTodos, newTodo];
    onUpdate({ brokerTodos: updated });
    fetch(`/api/vorgaenge/${vorgang.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerTodos: updated }),
    }).catch(() => {});
  }

  async function reviewCustomerTodo(todoId: string, action: "confirm" | "reopen") {
    const updated = vorgang.checklist.map(t =>
      t.id === todoId
        ? { ...t, status: action === "confirm" ? "done" as const : "open" as const, completedAt: action === "confirm" ? new Date().toISOString() : null }
        : t
    );
    onUpdate({ checklist: updated });
    fetch(`/api/vorgaenge/${vorgang.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: updated }),
    }).catch(() => {});
  }

  const mailSubject = encodeURIComponent(`Unterlagen: ${vorgang.title}`);
  const mailBody = encodeURIComponent(`Hallo,\n\nich habe für Sie folgendes vorbereitet: ${vorgang.title}.\n\nBitte laden Sie Ihre Unterlagen hier hoch:\n${portalUrl}\n\nMit freundlichen Grüßen`);
  const neverSent = !vorgang.portalSentAt;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#1C1C1C",
        border: expanded ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.06)",
        transition: "all 150ms ease",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
        style={{ transition: "background 150ms ease" }}
        onClick={onToggle}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: st.bg }}
        >
          <Icon icon={st.iconName} style={{ color: st.color, width: 14, height: 14 }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#FFFFFF" }}>{vorgang.title}</p>
          <p className="text-[10px] flex items-center gap-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>{formatDistanceToNow(new Date(vorgang.createdAt), { addSuffix: true, locale: de })}</span>
            {vorgang.lastActivityAt && (
              <span className="flex items-center gap-0.5" style={{ color: "rgba(52,211,153,0.8)" }}>
                <Icon icon="solar:activity-linear" style={{ width: 10, height: 10 }} />
                aktiv {formatDistanceToNow(new Date(vorgang.lastActivityAt), { addSuffix: true, locale: de })}
              </span>
            )}
            {vorgang.files.length > 0 && (
              <span>· {vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {neverSent && vorgang.status === "offen" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)" }}>
              Nicht gesendet
            </span>
          )}
          {!neverSent && vorgang.status === "offen" && vorgang.files.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,1)" }}>
              ↑ {vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""}
            </span>
          )}
          {pendingReviewCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)" }}>
              ● {pendingReviewCount} zur Prüfung
            </span>
          )}
          {vorgang.reminderCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
              {vorgang.reminderCount}× erinnert
            </span>
          )}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
          <Icon
            icon={expanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            style={{ color: "rgba(255,255,255,0.2)", width: 14, height: 14 }}
          />
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-4 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Actions */}
          {vorgang.status === "offen" && (
            <div className="flex flex-wrap gap-2">
              {neverSent ? (
                <button
                  onClick={handleSendLink}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "#F2EAD3", color: "#000000", opacity: sending ? 0.7 : 1 }}
                >
                  {sending
                    ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
                    : <Icon icon="solar:send-linear" style={{ width: 14, height: 14 }} />}
                  Per WhatsApp/E-Mail senden
                </button>
              ) : (
                <button
                  onClick={handleRemind}
                  disabled={reminding}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)", border: "1px solid rgba(251,191,36,0.2)", opacity: reminding ? 0.7 : 1 }}
                >
                  {reminding
                    ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(251,191,36,0.3)", borderTopColor: "rgba(251,191,36,1)" }} />
                    : <Icon icon="solar:bell-linear" style={{ width: 14, height: 14 }} />}
                  Erinnern
                  {vorgang.reminderCount > 0 && <span style={{ color: "rgba(251,191,36,0.7)" }}>({vorgang.reminderCount}/2)</span>}
                </button>
              )}
            </div>
          )}

          {/* Portal link */}
          <div>
            <p style={sectionLabel}>Kunden-Link</p>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <code className="flex-1 text-[11px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{portalUrl}</code>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0"
                style={{
                  background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)",
                  color: copied ? "rgba(52,211,153,1)" : "rgba(255,255,255,0.5)",
                  border: copied ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  transition: "all 150ms ease",
                }}
              >
                <Icon icon={copied ? "solar:check-read-linear" : "solar:copy-linear"} style={{ width: 11, height: 11 }} />
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}?subject=${mailSubject}&body=${mailBody}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: "rgba(59,130,246,0.08)", color: "rgba(96,165,250,1)", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <Icon icon="solar:letter-linear" style={{ width: 12, height: 12 }} /> E-Mail
                </a>
              )}
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon icon="solar:arrow-up-right-linear" style={{ width: 12, height: 12 }} /> Vorschau
              </a>
            </div>

            <div className="mt-1.5 space-y-0.5">
              {vorgang.portalSentAt && (
                <p className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <Icon icon="solar:send-linear" style={{ width: 10, height: 10 }} />
                  Gesendet {formatDistanceToNow(new Date(vorgang.portalSentAt), { addSuffix: true, locale: de })}
                </p>
              )}
              {vorgang.status === "offen" && vorgang.files.length > 0 && (
                <p className="text-[10px] flex items-center gap-1 font-medium" style={{ color: "rgba(52,211,153,0.8)" }}>
                  <Icon icon="solar:activity-linear" style={{ width: 10, height: 10 }} />
                  Kunde hat {vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""} hochgeladen — noch nicht abgesendet
                </p>
              )}
              {vorgang.status === "offen" && vorgang.files.length === 0 && vorgang.portalSentAt && (
                <p className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Keine Dateien hochgeladen
                </p>
              )}
            </div>
          </div>

          {/* Broker todos */}
          <div>
            <p style={sectionLabel}>Meine Aufgaben</p>
            {vorgang.brokerTodos.length === 0 && (
              <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.2)" }}>Keine Aufgaben hinzugefügt</p>
            )}
            <ul className="space-y-1.5 mb-2">
              {vorgang.brokerTodos.map(todo => (
                <li key={todo.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBrokerTodo(todo.id)}
                    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: todo.completed ? "rgba(52,211,153,1)" : "transparent",
                      border: todo.completed ? "none" : "2px solid rgba(255,255,255,0.2)",
                      transition: "all 150ms ease",
                    }}
                  >
                    {todo.completed && <Icon icon="solar:check-read-linear" style={{ color: "#FFFFFF", width: 10, height: 10 }} />}
                  </button>
                  <span
                    className="text-xs flex-1"
                    style={{
                      color: todo.completed ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)",
                      textDecoration: todo.completed ? "line-through" : "none",
                    }}
                  >
                    {todo.label}
                  </span>
                </li>
              ))}
            </ul>
            <BrokerTodoInput onAdd={addBrokerTodo} />
          </div>

          {/* Customer todos */}
          {vorgang.checklist.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p style={sectionLabel}>Kundenaufgaben</p>
                {pendingReviewCount > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)" }}>
                    {pendingReviewCount} zur Prüfung
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {vorgang.checklist.map(todo => (
                  <li key={todo.id} className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon
                        icon={todo.type === "upload" ? "solar:paperclip-linear" : "solar:check-square-linear"}
                        style={{ color: "rgba(255,255,255,0.25)", width: 14, height: 14 }}
                      />
                    </div>
                    <span
                      className="text-xs flex-1 leading-tight"
                      style={{
                        color: todo.status === "done" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                        textDecoration: todo.status === "done" ? "line-through" : "none",
                      }}
                    >
                      {todo.label}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {todo.status === "open" && (
                        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>Offen</span>
                      )}
                      {todo.status === "pending_review" && (
                        <>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)" }}>
                            Zur Prüfung
                          </span>
                          <button
                            onClick={() => reviewCustomerTodo(todo.id, "confirm")}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors"
                            style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,1)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(52,211,153,0.2)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(52,211,153,0.1)"; }}
                          >
                            ✓ OK
                          </button>
                          <button
                            onClick={() => reviewCustomerTodo(todo.id, "reopen")}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                          >
                            ↩
                          </button>
                        </>
                      )}
                      {todo.status === "done" && (
                        <>
                          <Icon icon="solar:check-circle-linear" style={{ color: "rgba(52,211,153,1)", width: 14, height: 14 }} />
                          <button
                            onClick={() => reviewCustomerTodo(todo.id, "reopen")}
                            className="text-[9px] transition-colors"
                            style={{ color: "rgba(255,255,255,0.2)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; }}
                            title="Zurücksetzen"
                          >
                            ↩
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Customer-uploaded files */}
          {vorgang.files.length > 0 && (
            <div>
              <p style={sectionLabel}>Hochgeladene Dateien ({vorgang.files.length})</p>
              <ul className="space-y-1.5">
                {vorgang.files.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Icon icon="solar:document-text-linear" style={{ color: "rgba(255,255,255,0.2)", width: 16, height: 16, flexShrink: 0 }} />
                    <a
                      href={`/api/blob/download?url=${encodeURIComponent(f.url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs truncate flex-1"
                      style={{ color: "#F2EAD3" }}
                    >
                      {f.name}
                    </a>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Broker files */}
          <div>
            <p style={sectionLabel}>Unterlagen für den Kunden</p>
            {(vorgang.brokerFiles || []).length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {(vorgang.brokerFiles || []).map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Icon icon="solar:document-text-linear" style={{ color: "rgba(255,255,255,0.2)", width: 16, height: 16, flexShrink: 0 }} />
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs truncate flex-1" style={{ color: "#F2EAD3" }}>
                      {f.name}
                    </a>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{formatBytes(f.size)}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-1 flex-shrink-0 transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}>
                      <Icon icon="solar:download-minimalistic-linear" style={{ width: 12, height: 12 }} />
                    </a>
                    <button
                      onClick={() => handleBrokerFileDelete(f.id)}
                      className="p-1 flex-shrink-0 rounded transition-colors"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; }}
                    >
                      <Icon icon="solar:trash-bin-trash-linear" style={{ width: 12, height: 12 }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {brokerUploadError && (
              <p className="text-[10px] mb-1" style={{ color: "#EF4444" }}>{brokerUploadError}</p>
            )}
            <input
              ref={brokerFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={handleBrokerFileSelect}
            />
            <button
              onClick={() => brokerFileInputRef.current?.click()}
              disabled={brokerUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: brokerUploading ? 0.6 : 1,
                transition: "all 150ms ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(242,234,211,0.08)";
                (e.currentTarget as HTMLElement).style.color = "#F2EAD3";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(242,234,211,0.2)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              {brokerUploading
                ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFFFFF" }} />
                : <Icon icon="solar:upload-minimalistic-linear" style={{ width: 14, height: 14 }} />}
              {brokerUploading ? "Wird hochgeladen..." : "PDF hochladen"}
            </button>
          </div>

          {/* Status buttons + delete */}
          <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                  style={{
                    background: vorgang.status === key ? s.bg : "transparent",
                    color: vorgang.status === key ? s.color : "rgba(255,255,255,0.3)",
                    border: vorgang.status === key ? `1px solid ${s.color}40` : "1px solid rgba(255,255,255,0.08)",
                    transition: "all 150ms ease",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.2)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Icon icon="solar:trash-bin-trash-linear" style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BrokerTodoInput ───────────────────────────────────────────────────────────

function BrokerTodoInput({ onAdd }: { onAdd: (label: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-1.5">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && value.trim()) { onAdd(value.trim()); setValue(""); } }}
        placeholder="Aufgabe hinzufügen..."
        style={{ ...{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "6px 10px", fontSize: 11, color: "#FFFFFF", outline: "none", transition: "border-color 150ms ease" }, flex: 1 }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
      />
      <button
        onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(""); } }}
        disabled={!value.trim()}
        className="px-2 py-1.5 rounded-lg text-xs transition-colors"
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", opacity: !value.trim() ? 0.4 : 1 }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(242,234,211,0.1)"; (e.currentTarget as HTMLElement).style.color = "#F2EAD3"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
      >
        <Icon icon="solar:add-circle-linear" style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

// ── Create Modal — 2-step ─────────────────────────────────────────────────────

function CreateVorgangModal({ contactId, contact, onClose, onCreated }: {
  contactId: string;
  contact: ContactInfo;
  onClose: () => void;
  onCreated: (v: Vorgang) => void;
}) {
  const [step, setStep]                         = useState<"template" | "form">("template");
  const [templates, setTemplates]               = useState<VorgangTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<VorgangTemplate | null>(null);
  const [title, setTitle]                       = useState("");
  const [description, setDescription]           = useState("");
  const [checklistInput, setChecklistInput]     = useState("");
  const [newItemType, setNewItemType]           = useState<"upload" | "task">("upload");
  const [items, setItems]                       = useState<Array<{ label: string; type: "upload" | "task" }>>([]);
  const [brokerTodoInput, setBrokerTodoInput]   = useState("");
  const [brokerItems, setBrokerItems]           = useState<string[]>([]);
  const [sendNow, setSendNow]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const canSendNow = !!(contact.phone || contact.email);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(variable: string) {
    const ta = descriptionRef.current;
    if (!ta) { setDescription(prev => prev + variable); return; }
    const start = ta.selectionStart ?? description.length;
    const end   = ta.selectionEnd   ?? description.length;
    const next  = description.slice(0, start) + variable + description.slice(end);
    setDescription(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + variable.length, start + variable.length); });
  }

  useEffect(() => {
    fetch("/api/vorgang-templates")
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  function buildDefaultMessage(templateDescription?: string): string {
    return templateDescription?.trim() ||
      `Hallo {{vorname}},\n\nbitte laden Sie die folgenden Unterlagen für *{{titel}}* hoch.\n\nBei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.`;
  }

  function pickTemplate(t: VorgangTemplate | null) {
    setSelectedTemplate(t);
    if (t) {
      setTitle(t.name);
      setDescription(buildDefaultMessage(t.description || undefined));
      try {
        const parsed = JSON.parse(t.checklist) as Array<{ label: string; type?: string }>;
        setItems(parsed.map(i => ({ label: i.label, type: (i.type as "upload" | "task") || "upload" })));
      } catch { setItems([]); }
    } else {
      setTitle(""); setDescription(buildDefaultMessage()); setItems([]);
    }
    setStep("form");
  }

  function addItem() {
    const val = checklistInput.trim();
    if (!val) return;
    setItems(prev => [...prev, { label: val, type: newItemType }]);
    setChecklistInput("");
  }

  function addBrokerTodo() {
    const val = brokerTodoInput.trim();
    if (!val) return;
    setBrokerItems(prev => [...prev, val]);
    setBrokerTodoInput("");
  }

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vorgaenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId, title, description, customerTodos: items, brokerTodos: brokerItems,
          templateId: selectedTemplate?.id || null, sendNow: canSendNow && sendNow,
        }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data.vorgang);
    } finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden flex flex-col"
        style={{
          background: "#1C1C1C",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          maxHeight: "90vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            {step === "form" && (
              <button
                onClick={() => setStep("template")}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.4)", background: "transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon icon="solar:arrow-left-linear" style={{ width: 16, height: 16 }} />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold" style={{ color: "#FFFFFF" }}>
                {step === "template" ? "Vorlage wählen" : "Vorgang konfigurieren"}
              </h2>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {step === "template" ? "Starte mit einer Vorlage oder von Grund auf"
                  : selectedTemplate ? `Vorlage: ${selectedTemplate.name}` : "Individueller Vorgang"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "rgba(255,255,255,0.4)", background: "transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Step 1 — template picker */}
        {step === "template" && (
          <div className="p-4 overflow-y-auto flex-1">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Blank start */}
                <button
                  onClick={() => pickTemplate(null)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                  style={{
                    border: "2px dashed rgba(255,255,255,0.08)",
                    background: "transparent",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(242,234,211,0.3)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(242,234,211,0.04)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <Icon icon="solar:add-circle-linear" style={{ color: "rgba(255,255,255,0.4)", width: 16, height: 16 }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>Leer starten</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Eigene Checkliste erstellen</p>
                  </div>
                </button>

                {/* Separator */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>Vorlagen</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>

                {templates.map(t => {
                  const catCfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.sonstiges;
                  const iconName = CATEGORY_ICON[t.category] || "solar:folder-open-linear";
                  let checklistItems: { label: string }[] = [];
                  try { checklistItems = JSON.parse(t.checklist); } catch { /* ignore */ }

                  return (
                    <button
                      key={t.id}
                      onClick={() => pickTemplate(t)}
                      className="w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all"
                      style={{
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.03)",
                        transition: "all 150ms ease",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: catCfg.bg, border: `1px solid ${catCfg.border}` }}
                      >
                        <Icon icon={iconName} style={{ color: catCfg.color, width: 16, height: 16 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>{t.name}</p>
                        {checklistItems.length > 0 && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {checklistItems.map(i => i.label).join(" · ")}
                          </p>
                        )}
                      </div>
                      <Icon icon="solar:bolt-linear" style={{ color: "rgba(255,255,255,0.15)", width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — form */}
        {step === "form" && (
          <>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Bezeichnung
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. KFZ-Versicherung VW Golf"
                  style={inputStyle}
                  autoFocus
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Beschreibung für das Portal
                </label>
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={9}
                  placeholder={`Hallo {{vorname}},\n\nbitte laden Sie die folgenden Unterlagen hoch.`}
                  style={{ ...inputStyle, resize: "none", fontFamily: "monospace", lineHeight: 1.6 }}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[{ label: "{{vorname}}", tip: "Vorname des Kunden" }, { label: "{{titel}}", tip: "Titel des Vorgangs" }].map(v => (
                    <button
                      key={v.label}
                      type="button"
                      title={v.tip}
                      onClick={() => insertVariable(v.label)}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.5)",
                        transition: "all 150ms ease",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(242,234,211,0.1)"; (e.currentTarget as HTMLElement).style.color = "#F2EAD3"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer todos */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Aufgaben für den Kunden
                </label>
                <div className="flex gap-2 items-start">
                  {/* Type toggle */}
                  <div
                    className="flex rounded-lg overflow-hidden flex-shrink-0"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setNewItemType("upload")}
                      className="px-2 py-2 text-xs flex items-center gap-1 transition-colors"
                      style={{
                        background: newItemType === "upload" ? "#F2EAD3" : "transparent",
                        color: newItemType === "upload" ? "#000000" : "rgba(255,255,255,0.35)",
                        transition: "all 150ms ease",
                      }}
                      title="Dokument hochladen"
                    >
                      <Icon icon="solar:paperclip-linear" style={{ width: 12, height: 12 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItemType("task")}
                      className="px-2 py-2 text-xs flex items-center gap-1 transition-colors"
                      style={{
                        background: newItemType === "task" ? "#F2EAD3" : "transparent",
                        color: newItemType === "task" ? "#000000" : "rgba(255,255,255,0.35)",
                        transition: "all 150ms ease",
                      }}
                      title="Aufgabe erledigen"
                    >
                      <Icon icon="solar:check-square-linear" style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={checklistInput}
                    onChange={e => setChecklistInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                    placeholder={newItemType === "upload" ? "z.B. Personalausweis, KFZ-Schein..." : "z.B. IBAN mitteilen..."}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                  <button
                    onClick={addItem}
                    disabled={!checklistInput.trim()}
                    className="px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: checklistInput.trim() ? "#F2EAD3" : "rgba(255,255,255,0.06)",
                      color: checklistInput.trim() ? "#000000" : "rgba(255,255,255,0.25)",
                      transition: "all 150ms ease",
                    }}
                  >
                    <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {items.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <Icon
                          icon={item.type === "upload" ? "solar:paperclip-linear" : "solar:check-square-linear"}
                          style={{ color: "rgba(255,255,255,0.25)", width: 14, height: 14, flexShrink: 0 }}
                        />
                        <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
                        <button
                          onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                          className="transition-colors"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; }}
                        >
                          <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Broker todos */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Meine Aufgaben <span className="font-normal normal-case" style={{ color: "rgba(255,255,255,0.2)" }}>(intern)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={brokerTodoInput}
                    onChange={e => setBrokerTodoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBrokerTodo(); } }}
                    placeholder="z.B. Angebot einholen, Police prüfen..."
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                  <button
                    onClick={addBrokerTodo}
                    disabled={!brokerTodoInput.trim()}
                    className="px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: brokerTodoInput.trim() ? "#F2EAD3" : "rgba(255,255,255,0.06)",
                      color: brokerTodoInput.trim() ? "#000000" : "rgba(255,255,255,0.25)",
                    }}
                  >
                    <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                {brokerItems.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {brokerItems.map((label, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ border: "2px solid rgba(255,255,255,0.2)" }} />
                        <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</span>
                        <button
                          onClick={() => setBrokerItems(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ color: "rgba(255,255,255,0.2)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; }}
                        >
                          <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Send now toggle */}
              <div
                className="rounded-xl p-4 transition-all"
                style={{
                  border: canSendNow && sendNow ? "1px solid rgba(242,234,211,0.2)" : "1px solid rgba(255,255,255,0.08)",
                  background: canSendNow && sendNow ? "rgba(242,234,211,0.05)" : "rgba(255,255,255,0.03)",
                  transition: "all 150ms ease",
                }}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => canSendNow && setSendNow(s => !s)}
                    className="relative rounded-full flex-shrink-0 transition-all"
                    style={{
                      width: 40,
                      height: 22,
                      background: canSendNow && sendNow ? "#F2EAD3" : "rgba(255,255,255,0.12)",
                      cursor: canSendNow ? "pointer" : "not-allowed",
                      opacity: canSendNow ? 1 : 0.4,
                      transition: "all 150ms ease",
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                      style={{
                        left: sendNow ? "calc(100% - 18px)" : "2px",
                        background: "#FFFFFF",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                        transition: "left 150ms ease",
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: canSendNow && sendNow ? "#F2EAD3" : "rgba(255,255,255,0.6)" }}>
                      Sofort per WhatsApp / E-Mail senden
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {canSendNow
                        ? "Portal-Link wird nach dem Erstellen automatisch verschickt"
                        : "Kein Telefon oder E-Mail hinterlegt"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex gap-3 px-6 py-4 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-sm font-medium transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Abbrechen
              </button>
              <button
                onClick={create}
                disabled={saving || !title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#F2EAD3", color: "#000000", opacity: saving || !title.trim() ? 0.5 : 1 }}
              >
                {saving
                  ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
                  : canSendNow && sendNow
                    ? <><Icon icon="solar:send-linear" style={{ width: 16, height: 16 }} /> Erstellen & Senden</>
                    : <><Icon icon="solar:folder-open-linear" style={{ width: 16, height: 16 }} /> Vorgang erstellen</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
