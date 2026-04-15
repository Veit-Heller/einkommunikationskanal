"use client";

import { useState, useEffect } from "react";
import {
  Plus, X, Trash2, ExternalLink, Copy, CheckCheck,
  Clock, CheckCircle2, AlertCircle, FolderOpen,
  Send, MessageCircle, Mail, FileText, ChevronDown, ChevronUp,
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
  token: string;
  status: string;
  createdAt: string;
  contact: { id: string; firstName: string | null; lastName: string | null; phone: string | null; email: string | null };
}

const STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  offen:        { label: "Offen",       color: "text-slate-600",   bg: "bg-slate-100",   icon: Clock },
  eingereicht:  { label: "Eingereicht", color: "text-amber-700",   bg: "bg-amber-100",   icon: AlertCircle },
  abgeschlossen:{ label: "Abgeschlossen",color:"text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
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

export default function VorgaengeTab({ contact }: { contact: ContactInfo }) {
  const [vorgaenge, setVorgaenge]   = useState<Vorgang[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/vorgaenge?contactId=${contact.id}`)
      .then(r => r.json())
      .then(d => {
        setVorgaenge((d.vorgaenge || []).map((v: Vorgang & { checklist: string; files: string }) => ({
          ...v,
          checklist: typeof v.checklist === "string" ? JSON.parse(v.checklist) : v.checklist,
          files:     typeof v.files     === "string" ? JSON.parse(v.files)     : v.files,
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
        const st = STATUS[v.status] || STATUS.offen;
        const StIcon = st.icon;
        const isExpanded = !!expanded[v.id];
        const portalUrl = typeof window !== "undefined"
          ? `${window.location.origin}/portal/${v.token}`
          : `/portal/${v.token}`;

        return (
          <VorgangCard
            key={v.id}
            vorgang={v}
            expanded={isExpanded}
            portalUrl={portalUrl}
            contact={contact}
            onToggle={() => setExpanded(e => ({ ...e, [v.id]: !e[v.id] }))}
            onDelete={() => deleteVorgang(v.id)}
            onStatusChange={(s) => updateStatus(v.id, s)}
          />
        );
      })}

      {showCreate && (
        <CreateVorgangModal
          contactId={contact.id}
          onClose={() => setShowCreate(false)}
          onCreated={(v) => {
            const parsed = {
              ...v,
              checklist: typeof v.checklist === "string" ? JSON.parse(v.checklist) : v.checklist,
              files:     typeof v.files     === "string" ? JSON.parse(v.files)     : v.files,
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
  vorgang, expanded, portalUrl, contact, onToggle, onDelete, onStatusChange,
}: {
  vorgang: Vorgang;
  expanded: boolean;
  portalUrl: string;
  contact: ContactInfo;
  onToggle: () => void;
  onDelete: () => void;
  onStatusChange: (s: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const st = STATUS[vorgang.status] || STATUS.offen;
  const StIcon = st.icon;

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappMsg = encodeURIComponent(
    `Hallo, ich habe für Sie einen Vorgang angelegt: ${vorgang.title}.\n\nBitte laden Sie hier Ihre Unterlagen hoch:\n${portalUrl}`
  );
  const mailSubject = encodeURIComponent(`Unterlagen: ${vorgang.title}`);
  const mailBody    = encodeURIComponent(
    `Hallo,\n\nich habe für Sie folgendes vorbereitet: ${vorgang.title}.\n\nBitte laden Sie Ihre Unterlagen hier hoch:\n${portalUrl}\n\nMit freundlichen Grüßen`
  );

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
          <p className="text-[10px] text-slate-400">
            {formatDistanceToNow(new Date(vorgang.createdAt), { addSuffix: true, locale: de })}
            {vorgang.files.length > 0 && ` · ${vorgang.files.length} Datei${vorgang.files.length !== 1 ? "en" : ""}`}
          </p>
        </div>
        <span className={`badge ${st.bg} ${st.color} flex-shrink-0 text-[10px]`}>{st.label}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-300 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-300 flex-shrink-0" />}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
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

            {/* Send via */}
            <div className="flex gap-2 mt-2">
              {contact.phone && (
                <a
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}?text=${whatsappMsg}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100"
                >
                  <MessageCircle size={12} /> Per WhatsApp senden
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}?subject=${mailSubject}&body=${mailBody}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-xl text-xs font-semibold hover:bg-sky-100 transition-colors border border-sky-100"
                >
                  <Mail size={12} /> Per E-Mail senden
                </a>
              )}
              <a
                href={portalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <ExternalLink size={12} /> Vorschau
              </a>
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
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
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

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateVorgangModal({ contactId, onClose, onCreated }: {
  contactId: string;
  onClose: () => void;
  onCreated: (v: Vorgang) => void;
}) {
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [items, setItems]             = useState<string[]>([]);
  const [saving, setSaving]           = useState(false);

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
        body: JSON.stringify({ contactId, title, description, checklist: items }),
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
          <div>
            <h2 className="text-base font-bold text-slate-900">Neuer Vorgang</h2>
            <p className="text-xs text-slate-400">Dokumentenanfrage erstellen</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

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

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nachricht an Kunden <span className="normal-case font-normal text-slate-300">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="z.B. Ich habe für Sie ein KFZ-Versicherungsangebot vorbereitet. Bitte laden Sie folgende Unterlagen hoch..."
              className="input resize-none"
            />
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

            {/* Quick add suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["Personalausweis", "KFZ-Schein", "Führerschein", "Aktuelle Police", "SF-Bescheinigung", "IBAN"].map(s => (
                !items.includes(s) && (
                  <button
                    key={s}
                    onClick={() => setItems(prev => [...prev, s])}
                    className="text-[11px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full hover:bg-lime-50 hover:text-lime-600 transition-colors"
                  >
                    + {s}
                  </button>
                )
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Abbrechen</button>
          <button
            onClick={create}
            disabled={saving || !title.trim()}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            Vorgang erstellen
          </button>
        </div>
      </div>
    </div>
  );
}
