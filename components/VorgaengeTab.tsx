"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, X, Trash2, ExternalLink, Copy, CheckCheck,
  Clock, CheckCircle2, AlertCircle, FolderOpen,
  MessageCircle, Mail, FileText, ChevronDown, ChevronUp,
  Send, Bell, Zap, Car, Shield, FileCheck, ArrowLeft,
  Loader2, Activity, Upload, Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface ChecklistItem { id: string; label: string; completed: boolean; completedAt: string | null; }
interface UploadedFile  { id: string; name: string; url: string; size: number; uploadedAt: string; }

interface Vorgang {
  id: string;
  title: string;
  description: string | null;
  checklist: ChecklistItem[];
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
  checklist: string; // JSON
}

const STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  offen:        { label: "Offen",        color: "text-slate-600",   bg: "bg-slate-100",   icon: Clock },
  teilweise:    { label: "Teilweise",    color: "text-orange-700",  bg: "bg-orange-100",  icon: AlertCircle },
  eingereicht:  { label: "Eingereicht",  color: "text-amber-700",   bg: "bg-amber-100",   icon: AlertCircle },
  abgeschlossen:{ label: "Abgeschlossen",color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  schaden:    Car,
  neuvertrag: FileCheck,
  service:    Shield,
  sonstiges:  FolderOpen,
};

const CATEGORY_COLOR: Record<string, string> = {
  schaden:    "bg-red-50 border-red-200 text-red-700",
  neuvertrag: "bg-blue-50 border-blue-200 text-blue-700",
  service:    "bg-violet-50 border-violet-200 text-violet-700",
  sonstiges:  "bg-slate-50 border-slate-200 text-slate-600",
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
        setVorgaenge((d.vorgaenge || []).map((v: Vorgang & { checklist: string; files: string; brokerFiles: string }) => ({
          ...v,
          checklist:   typeof v.checklist   === "string" ? JSON.parse(v.checklist)   : v.checklist,
          files:       typeof v.files       === "string" ? JSON.parse(v.files)       : v.files,
          brokerFiles: typeof v.brokerFiles === "string" ? JSON.parse(v.brokerFiles) : (v.brokerFiles || []),
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
        <div className="w-5 h-5 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowCreate(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-lime-400 hover:text-lime-600 transition-all"
      >
        <Plus className="w-4 h-4" />
        Neuen Vorgang erstellen
      </button>

      {vorgaenge.length === 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6 text-slate-200" />
          </div>
          <p className="text-sm text-slate-400">Noch keine Vorgänge</p>
          <p className="text-xs text-slate-300 mt-0.5">Erstelle einen Vorgang um Dokumente anzufordern</p>
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
            onStatusChange={(s) => updateStatus(v.id, s)}
            onUpdate={(patch) => updateVorgang(v.id, patch)}
          />
        );
      })}

      {showCreate && (
        <CreateVorgangModal
          contactId={contact.id}
          contact={contact}
          onClose={() => setShowCreate(false)}
          onCreated={(v) => {
            const parsed = {
              ...v,
              checklist:   typeof v.checklist   === "string" ? JSON.parse(v.checklist)   : v.checklist,
              files:       typeof v.files       === "string" ? JSON.parse(v.files)       : v.files,
              brokerFiles: typeof (v as unknown as { brokerFiles: string }).brokerFiles === "string"
                ? JSON.parse((v as unknown as { brokerFiles: string }).brokerFiles)
                : ((v as unknown as { brokerFiles: UploadedFile[] }).brokerFiles || []),
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
  const st = STATUS[vorgang.status] || STATUS.offen;
  const StIcon = st.icon;

  async function handleBrokerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrokerUploading(true);
    setBrokerUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/broker-upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      onUpdate({ brokerFiles: [...(vorgang.brokerFiles || []), data.file] });
    } catch (err) {
      setBrokerUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setBrokerUploading(false);
      // Reset so same file can be re-selected
      if (brokerFileInputRef.current) brokerFileInputRef.current.value = "";
    }
  }

  async function handleBrokerFileDelete(fileId: string) {
    try {
      await fetch(`/api/vorgaenge/${vorgang.id}/broker-upload`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
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
      if (res.ok) {
        onUpdate({ portalSentAt: data.portalSentAt });
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  async function handleRemind() {
    setReminding(true);
    try {
      const res = await fetch(`/api/vorgaenge/${vorgang.id}/remind`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        onUpdate({ reminderCount: data.reminderCount, lastReminderAt: data.lastReminderAt });
      }
    } catch { /* ignore */ }
    finally { setReminding(false); }
  }

  const whatsappMsg = encodeURIComponent(
    `Hallo, ich habe für Sie einen Vorgang angelegt: ${vorgang.title}.\n\nBitte laden Sie hier Ihre Unterlagen hoch:\n${portalUrl}`
  );
  const mailSubject = encodeURIComponent(`Unterlagen: ${vorgang.title}`);
  const mailBody    = encodeURIComponent(
    `Hallo,\n\nich habe für Sie folgendes vorbereitet: ${vorgang.title}.\n\nBitte laden Sie Ihre Unterlagen hier hoch:\n${portalUrl}\n\nMit freundlichen Grüßen`
  );

  const canRemind = vorgang.status === "offen" && !!vorgang.portalSentAt;
  const neverSent = !vorgang.portalSentAt;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${st.bg}`}>
          <StIcon className={`w-3.5 h-3.5 ${st.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{vorgang.title}</p>
          <p className="text-[10px] text-slate-400 flex items-center gap-2">
            <span>{formatDistanceToNow(new Date(vorgang.createdAt), { addSuffix: true, locale: de })}</span>
            {vorgang.lastActivityAt && (
              <span className="flex items-center gap-0.5 text-lime-600">
                <Activity className="w-2.5 h-2.5" />
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
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              Nicht gesendet
            </span>
          )}
          {/* Customer has started uploading but not yet submitted */}
          {!neverSent && vorgang.status === "offen" && vorgang.files.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full flex items-center gap-0.5">
              ↑ {vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""}
            </span>
          )}
          {vorgang.reminderCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
              {vorgang.reminderCount}× erinnert
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
            {st.label}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">

          {/* Send / Remind actions */}
          {vorgang.status === "offen" && (
            <div className="flex flex-wrap gap-2">
              {neverSent ? (
                <button
                  onClick={handleSendLink}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-lime-500 text-white rounded-xl text-xs font-semibold hover:bg-lime-600 disabled:opacity-60 transition-all shadow-sm shadow-lime-500/25"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Per WhatsApp/E-Mail senden
                </button>
              ) : (
                <button
                  onClick={handleRemind}
                  disabled={reminding}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 disabled:opacity-60 transition-all"
                >
                  {reminding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Erinnern
                  {vorgang.reminderCount > 0 && (
                    <span className="ml-0.5 text-amber-500">({vorgang.reminderCount}/2)</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Portal link */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kunden-Link</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
              <code className="flex-1 text-[11px] text-slate-500 truncate">{portalUrl}</code>
              <button
                onClick={copyLink}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0 ${
                  copied ? "bg-lime-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>

            {/* Manual share via wa.me / mailto */}
            <div className="flex flex-wrap gap-2 mt-2">
              {contact.phone && (
                <a
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}?text=${whatsappMsg}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}?subject=${mailSubject}&body=${mailBody}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-xl text-xs font-semibold hover:bg-sky-100 transition-colors border border-sky-100"
                >
                  <Mail size={12} /> E-Mail
                </a>
              )}
              <a
                href={portalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <ExternalLink size={12} /> Vorschau
              </a>
            </div>

            {/* Sent info + upload progress */}
            <div className="mt-1.5 space-y-0.5">
              {vorgang.portalSentAt && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Send className="w-2.5 h-2.5" />
                  Gesendet {formatDistanceToNow(new Date(vorgang.portalSentAt), { addSuffix: true, locale: de })}
                </p>
              )}
              {vorgang.status === "offen" && vorgang.files.length > 0 && (
                <p className="text-[10px] text-teal-600 flex items-center gap-1 font-medium">
                  <Activity className="w-2.5 h-2.5" />
                  Kunde hat {vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""} hochgeladen — noch nicht abgesendet
                </p>
              )}
              {vorgang.status === "offen" && vorgang.files.length === 0 && vorgang.portalSentAt && (
                <p className="text-[10px] text-slate-300 flex items-center gap-1">
                  Keine Dateien hochgeladen
                </p>
              )}
            </div>
          </div>

          {/* Checklist */}
          {vorgang.checklist.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Checkliste</p>
              <ul className="space-y-1.5">
                {vorgang.checklist.map(item => (
                  <li key={item.id} className="flex items-center gap-2 text-xs">
                    {item.completed
                      ? <CheckCircle2 className="w-4 h-4 text-lime-500 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    }
                    <span className={item.completed ? "line-through text-slate-400" : "text-slate-600"}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Uploaded files */}
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
                      className="text-xs text-lime-600 hover:underline truncate flex-1"
                    >
                      {f.name}
                    </a>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Broker files — Unterlagen für den Kunden */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Unterlagen für den Kunden
            </p>
            {(vorgang.brokerFiles || []).length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {(vorgang.brokerFiles || []).map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-lime-600 hover:underline truncate flex-1"
                    >
                      {f.name}
                    </a>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-300 hover:text-lime-500 transition-colors flex-shrink-0"
                      title="Herunterladen"
                    >
                      <Download size={12} />
                    </a>
                    <button
                      onClick={() => handleBrokerFileDelete(f.id)}
                      className="p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      title="Löschen"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {brokerUploadError && (
              <p className="text-[10px] text-red-500 mb-1">{brokerUploadError}</p>
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700 disabled:opacity-60 transition-all"
            >
              {brokerUploading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />
              }
              {brokerUploading ? "Wird hochgeladen..." : "PDF hochladen"}
            </button>
          </div>

          {/* Status + actions */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex gap-1.5">
              {Object.entries(STATUS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    vorgang.status === key
                      ? `${s.bg} ${s.color} border-current`
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
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
  const [step, setStep]                   = useState<"template" | "form">("template");
  const [templates, setTemplates]         = useState<VorgangTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<VorgangTemplate | null>(null);

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [items, setItems]             = useState<string[]>([]);
  const [sendNow, setSendNow]         = useState(true);
  const [saving, setSaving]           = useState(false);

  const canSendNow = !!(contact.phone || contact.email);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(variable: string) {
    const ta = descriptionRef.current;
    if (!ta) {
      setDescription(prev => prev + variable);
      return;
    }
    const start = ta.selectionStart ?? description.length;
    const end   = ta.selectionEnd   ?? description.length;
    const next  = description.slice(0, start) + variable + description.slice(end);
    setDescription(next);
    // Restore cursor after the inserted variable
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + variable.length, start + variable.length);
    });
  }

  useEffect(() => {
    fetch("/api/vorgang-templates")
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  function buildDefaultMessage(templateDescription?: string): string {
    const descLine = templateDescription ? `\n${templateDescription}\n` : "";
    return [
      `Hallo {{vorname}},`,
      ``,
      `für *{{titel}}* habe ich einen sicheren Upload-Link für Sie eingerichtet.`,
      descLine,
      `Bitte laden Sie die benötigten Unterlagen hier hoch:`,
      `{{portalLink}}`,
      ``,
      `Bei Fragen stehe ich jederzeit zur Verfügung.`,
      ``,
      `{{maklername}}`,
    ].join("\n");
  }

  function pickTemplate(t: VorgangTemplate | null) {
    setSelectedTemplate(t);
    if (t) {
      setTitle(t.name);
      setDescription(buildDefaultMessage(t.description || undefined));
      try {
        const parsed = JSON.parse(t.checklist) as Array<{ label: string }>;
        setItems(parsed.map(i => i.label));
      } catch { setItems([]); }
    } else {
      setTitle("");
      setDescription(buildDefaultMessage());
      setItems([]);
    }
    setStep("form");
  }

  function addItem() {
    const val = checklistInput.trim();
    if (!val) return;
    setItems(prev => [...prev, val]);
    setChecklistInput("");
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vorgaenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          title,
          description,
          checklist: items,
          templateId: selectedTemplate?.id || null,
          sendNow: canSendNow && sendNow,
        }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data.vorgang);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === "form" && (
              <button
                onClick={() => setStep("template")}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {step === "template" ? "Vorlage wählen" : "Vorgang konfigurieren"}
              </h2>
              <p className="text-xs text-slate-400">
                {step === "template"
                  ? "Starte mit einer Vorlage oder von Grund auf"
                  : selectedTemplate ? `Vorlage: ${selectedTemplate.name}` : "Individueller Vorgang"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1 — Template picker */}
        {step === "template" && (
          <div className="p-4 overflow-y-auto flex-1">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Blank start */}
                <button
                  onClick={() => pickTemplate(null)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-lime-400 hover:bg-lime-50 transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-lime-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-lime-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-lime-700">Leer starten</p>
                    <p className="text-xs text-slate-400">Eigene Checkliste erstellen</p>
                  </div>
                </button>

                {/* Separator */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Vorlagen
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Template cards */}
                {templates.map(t => {
                  const Icon = CATEGORY_ICON[t.category] || FolderOpen;
                  const colorClass = CATEGORY_COLOR[t.category] || CATEGORY_COLOR.sonstiges;
                  let checklistItems: { label: string }[] = [];
                  try { checklistItems = JSON.parse(t.checklist); } catch { /* ignore */ }

                  return (
                    <button
                      key={t.id}
                      onClick={() => pickTemplate(t)}
                      className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group"
                    >
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">{t.name}</p>
                        {checklistItems.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {checklistItems.map(i => i.label).join(" · ")}
                          </p>
                        )}
                      </div>
                      <Zap className="w-3.5 h-3.5 text-slate-300 group-hover:text-lime-400 mt-0.5 flex-shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Form */}
        {step === "form" && (
          <>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bezeichnung</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. KFZ-Versicherung VW Golf"
                  className="input"
                  autoFocus
                />
              </div>

              {/* Description / full message editor */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nachricht an Kunden
                </label>
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={9}
                  placeholder={`Hallo {{vorname}},\n\nfür *{{titel}}* habe ich einen sicheren Upload-Link für Sie eingerichtet.\n\nBitte laden Sie die benötigten Unterlagen hier hoch:\n{{portalLink}}\n\nBei Fragen stehe ich jederzeit zur Verfügung.\n\n{{maklername}}`}
                  className="input resize-none font-mono text-xs leading-relaxed"
                />
                {/* Variable chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: "{{vorname}}",    tip: "Vorname des Kunden" },
                    { label: "{{portalLink}}", tip: "Upload-Link" },
                    { label: "{{titel}}",      tip: "Titel des Vorgangs" },
                    { label: "{{maklername}}",  tip: "Ihr Name" },
                  ].map(v => (
                    <button
                      key={v.label}
                      type="button"
                      title={v.tip}
                      onClick={() => insertVariable(v.label)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-mono hover:bg-lime-100 hover:text-lime-700 transition-colors border border-slate-200 hover:border-lime-300"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checklist builder */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Benötigte Unterlagen
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checklistInput}
                    onChange={e => setChecklistInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); }}}
                    placeholder="z.B. Personalausweis, KFZ-Schein..."
                    className="input flex-1"
                  />
                  <button
                    onClick={addItem}
                    disabled={!checklistInput.trim()}
                    className="btn-primary px-3 py-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {items.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        <span className="flex-1 text-sm text-slate-700">{item}</span>
                        <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Send now toggle */}
              <div className={`rounded-xl border p-4 transition-all ${
                canSendNow && sendNow
                  ? "border-lime-200 bg-lime-50"
                  : "border-slate-200 bg-slate-50"
              }`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => canSendNow && setSendNow(s => !s)}
                    className={`relative w-10 h-5.5 rounded-full transition-all flex-shrink-0 ${
                      canSendNow && sendNow ? "bg-lime-500" : "bg-slate-200"
                    } ${!canSendNow ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    style={{ width: "40px", height: "22px" }}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                      sendNow ? "left-5" : "left-0.5"
                    }`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${canSendNow && sendNow ? "text-lime-800" : "text-slate-600"}`}>
                      Sofort per WhatsApp / E-Mail senden
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {canSendNow
                        ? "Portal-Link wird nach dem Erstellen automatisch verschickt"
                        : "Kein Telefon oder E-Mail hinterlegt"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Abbrechen</button>
              <button
                onClick={create}
                disabled={saving || !title.trim()}
                className="btn-primary flex-1 justify-center"
              >
                {saving
                  ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : canSendNow && sendNow ? <><Send className="w-4 h-4" /> Erstellen & Senden</> : <><FolderOpen className="w-4 h-4" /> Vorgang erstellen</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
