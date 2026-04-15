"use client";

import { useState, useEffect } from "react";
import {
  Car, Shield, Home, Heart, Briefcase, Scale, Plus,
  ChevronDown, ChevronUp, Trash2, Edit3, Check, X,
  FileText, Euro, Calendar, Star, Garage,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InsuranceProduct {
  id: string;
  type: string;
  status: string;
  fields: string | null;
  notes: string | null;
  createdAt: string;
}

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  placeholder?: string;
  options?: string[];
  icon?: React.ElementType;
  unit?: string;
};

// ── Product type config ────────────────────────────────────────────────────────

const PRODUCT_TYPES: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  fields: FieldDef[];
}> = {
  kfz: {
    label: "KFZ-Versicherung",
    icon: Car,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    fields: [
      { key: "fahrzeugMarke",       label: "Marke",                  type: "text",   placeholder: "z.B. VW, BMW, Mercedes" },
      { key: "fahrzeugModell",      label: "Modell",                 type: "text",   placeholder: "z.B. Golf, 3er, C-Klasse" },
      { key: "baujahr",             label: "Baujahr",                type: "text",   placeholder: "z.B. 2019" },
      { key: "kennzeichen",         label: "Kennzeichen",            type: "text",   placeholder: "z.B. M-AB 1234" },
      { key: "aktuelleVersicherung",label: "Aktuelle Versicherung",  type: "text",   placeholder: "z.B. HUK, ADAC, Allianz" },
      { key: "policennummer",       label: "Policennummer",          type: "text",   placeholder: "z.B. KFZ-123456" },
      { key: "praemie",             label: "Prämie/Jahr (€)",        type: "number", placeholder: "z.B. 480", unit: "€/Jahr" },
      { key: "ablaufdatum",         label: "Ablaufdatum Police",     type: "date" },
      { key: "sfKlasse",            label: "SF-Klasse",              type: "text",   placeholder: "z.B. SF15, SF25" },
      { key: "kilometerleistung",   label: "Km/Jahr",                type: "number", placeholder: "z.B. 15000", unit: "km/Jahr" },
      { key: "garagenstellplatz",   label: "Garagenstellplatz",      type: "boolean" },
      { key: "kfzScheinVorhanden",  label: "KFZ-Schein hinterlegt", type: "boolean" },
    ],
  },
  haftpflicht: {
    label: "Haftpflicht",
    icon: Shield,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    fields: [
      { key: "aktuelleVersicherung",label: "Aktuelle Versicherung",  type: "text",   placeholder: "z.B. HUK, Allianz" },
      { key: "policennummer",       label: "Policennummer",          type: "text",   placeholder: "z.B. HP-123456" },
      { key: "praemie",             label: "Prämie/Jahr (€)",        type: "number", placeholder: "z.B. 60", unit: "€/Jahr" },
      { key: "ablaufdatum",         label: "Ablaufdatum",            type: "date" },
      { key: "haushaltsgroesse",    label: "Haushaltsgröße",         type: "select", options: ["Single", "Paar", "Familie"] },
      { key: "wohnsituation",       label: "Wohnsituation",          type: "select", options: ["Mieter", "Eigentümer"] },
    ],
  },
  hausrat: {
    label: "Hausrat",
    icon: Home,
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    fields: [
      { key: "aktuelleVersicherung",label: "Aktuelle Versicherung",  type: "text",   placeholder: "z.B. HUK, Allianz" },
      { key: "policennummer",       label: "Policennummer",          type: "text",   placeholder: "z.B. HR-123456" },
      { key: "praemie",             label: "Prämie/Jahr (€)",        type: "number", placeholder: "z.B. 120", unit: "€/Jahr" },
      { key: "ablaufdatum",         label: "Ablaufdatum",            type: "date" },
      { key: "wohnflaeche",         label: "Wohnfläche (m²)",        type: "number", placeholder: "z.B. 80", unit: "m²" },
      { key: "plz",                 label: "PLZ",                    type: "text",   placeholder: "z.B. 80331" },
      { key: "versicherungswert",   label: "Versicherungswert (€)",  type: "number", placeholder: "z.B. 40000", unit: "€" },
    ],
  },
  leben: {
    label: "Lebensversicherung",
    icon: Heart,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    fields: [
      { key: "aktuelleVersicherung",label: "Aktuelle Versicherung",  type: "text",   placeholder: "z.B. Allianz, Axa" },
      { key: "policennummer",       label: "Policennummer",          type: "text",   placeholder: "z.B. LV-123456" },
      { key: "praemie",             label: "Prämie/Monat (€)",       type: "number", placeholder: "z.B. 80", unit: "€/Monat" },
      { key: "ablaufdatum",         label: "Laufzeit bis",           type: "date" },
      { key: "absicherungssumme",   label: "Absicherungssumme (€)",  type: "number", placeholder: "z.B. 200000", unit: "€" },
      { key: "raucher",             label: "Raucher",                type: "boolean" },
      { key: "beruf",               label: "Beruf",                  type: "text",   placeholder: "z.B. Kaufmann, Ingenieur" },
    ],
  },
  bu: {
    label: "Berufsunfähigkeit",
    icon: Briefcase,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    fields: [
      { key: "aktuelleVersicherung",label: "Aktuelle Versicherung",  type: "text",   placeholder: "z.B. Swiss Life, HDI" },
      { key: "policennummer",       label: "Policennummer",          type: "text",   placeholder: "z.B. BU-123456" },
      { key: "praemie",             label: "Prämie/Monat (€)",       type: "number", placeholder: "z.B. 120", unit: "€/Monat" },
      { key: "ablaufdatum",         label: "Laufzeit bis",           type: "date" },
      { key: "buRente",             label: "BU-Rente/Monat (€)",     type: "number", placeholder: "z.B. 1500", unit: "€/Monat" },
      { key: "beruf",               label: "Beruf",                  type: "text",   placeholder: "z.B. Handwerker, Bürokaufmann" },
      { key: "raucher",             label: "Raucher",                type: "boolean" },
    ],
  },
  rechtsschutz: {
    label: "Rechtsschutz",
    icon: Scale,
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    fields: [
      { key: "aktuelleVersicherung",label: "Aktuelle Versicherung",  type: "text",   placeholder: "z.B. ARAG, Roland" },
      { key: "policennummer",       label: "Policennummer",          type: "text",   placeholder: "z.B. RS-123456" },
      { key: "praemie",             label: "Prämie/Jahr (€)",        type: "number", placeholder: "z.B. 200", unit: "€/Jahr" },
      { key: "ablaufdatum",         label: "Ablaufdatum",            type: "date" },
      { key: "familienstand",       label: "Familienstand",          type: "select", options: ["Single", "Paar", "Familie"] },
      { key: "verkehrsrechtsschutz",label: "Verkehrsrechtsschutz",   type: "boolean" },
      { key: "mietrechtsschutz",    label: "Mietrechtsschutz",       type: "boolean" },
      { key: "berufsrechtsschutz",  label: "Berufsrechtsschutz",     type: "boolean" },
    ],
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  interessent:  { label: "Interessent",  color: "text-slate-600",   bg: "bg-slate-100" },
  angebot:      { label: "Angebot",      color: "text-amber-700",   bg: "bg-amber-100" },
  abgeschlossen:{ label: "Abgeschlossen",color: "text-emerald-700", bg: "bg-emerald-100" },
  verloren:     { label: "Verloren",     color: "text-red-600",     bg: "bg-red-100" },
};

// ── Helper ────────────────────────────────────────────────────────────────────

function parseFields(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function formatFieldValue(def: FieldDef, value: string): string {
  if (!value) return "—";
  if (def.type === "boolean") return value === "true" ? "Ja" : "Nein";
  if (def.type === "date") {
    try { return new Date(value).toLocaleDateString("de-DE"); } catch { return value; }
  }
  if (def.unit) return `${Number(value).toLocaleString("de-DE")} ${def.unit}`;
  return value;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InsuranceProducts({ contactId }: { contactId: string }) {
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/contacts/${contactId}/products`)
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [contactId]);

  function toggle(id: string) {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  }

  async function deleteProduct(id: string) {
    if (!confirm("Produkt wirklich löschen?")) return;
    await fetch(`/api/contacts/${contactId}/products/${id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/contacts/${contactId}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }

  async function saveProduct(id: string, fields: Record<string, string>, notes: string) {
    await fetch(`/api/contacts/${contactId}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields, notes }),
    });
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, fields: JSON.stringify(fields), notes } : p
    ));
    setEditing(null);
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
      {/* Add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-lime-400 hover:text-lime-600 transition-all"
      >
        <Plus className="w-4 h-4" />
        Versicherungsprodukt hinzufügen
      </button>

      {/* Product list */}
      {products.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-slate-200" />
          </div>
          <p className="text-sm text-slate-400">Noch keine Produkte</p>
          <p className="text-xs text-slate-300 mt-0.5">Füge das erste Versicherungsprodukt hinzu</p>
        </div>
      )}

      {products.map(product => {
        const cfg = PRODUCT_TYPES[product.type];
        if (!cfg) return null;
        const Icon = cfg.icon;
        const fields = parseFields(product.fields);
        const statusCfg = STATUS_CONFIG[product.status] || STATUS_CONFIG.interessent;
        const isExpanded = !!expanded[product.id];
        const isEditing = editing === product.id;

        return (
          <div
            key={product.id}
            className={`bg-white rounded-2xl border ${cfg.border} overflow-hidden transition-all`}
          >
            {/* Header row */}
            <div
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${cfg.bg} hover:brightness-95 transition-all`}
              onClick={() => toggle(product.id)}
            >
              <div className={`w-8 h-8 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                {fields.aktuelleVersicherung && (
                  <p className="text-xs text-slate-500 truncate">{fields.aktuelleVersicherung}</p>
                )}
              </div>

              {/* Status pill */}
              <span className={`badge ${statusCfg.bg} ${statusCfg.color} flex-shrink-0`}>
                {statusCfg.label}
              </span>

              {/* Ablaufdatum quick view */}
              {fields.ablaufdatum && (
                <span className="text-[11px] text-slate-400 flex-shrink-0 hidden sm:block">
                  bis {new Date(fields.ablaufdatum).toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
                </span>
              )}

              {/* Prämie quick view */}
              {fields.praemie && (
                <span className="text-[11px] font-semibold text-slate-600 flex-shrink-0 hidden sm:block">
                  {Number(fields.praemie).toLocaleString("de-DE")} €
                </span>
              )}

              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-3 space-y-4 border-t border-slate-100">
                {/* Status changer */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => updateStatus(product.id, key)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                          product.status === key
                            ? `${s.bg} ${s.color} border-current shadow-sm`
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {product.status === key && <Check className="w-3 h-3 inline mr-1" />}
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fields */}
                {isEditing ? (
                  <ProductEditForm
                    product={product}
                    fieldDefs={cfg.fields}
                    onSave={(f, n) => saveProduct(product.id, f, n)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <ProductFieldDisplay
                    fieldDefs={cfg.fields}
                    fields={fields}
                    notes={product.notes}
                  />
                )}

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setEditing(product.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Bearbeiten
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Löschen
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add product modal */}
      {showAdd && (
        <AddProductModal
          contactId={contactId}
          onClose={() => setShowAdd(false)}
          onCreated={(p) => {
            setProducts(prev => [p, ...prev]);
            setShowAdd(false);
            setExpanded(e => ({ ...e, [p.id]: true }));
          }}
        />
      )}
    </div>
  );
}

// ── Field display ─────────────────────────────────────────────────────────────

function ProductFieldDisplay({
  fieldDefs, fields, notes,
}: {
  fieldDefs: FieldDef[];
  fields: Record<string, string>;
  notes: string | null;
}) {
  const filledFields = fieldDefs.filter(d => fields[d.key] !== undefined && fields[d.key] !== "");

  if (filledFields.length === 0 && !notes) {
    return <p className="text-xs text-slate-300 italic">Noch keine Daten eingetragen — auf Bearbeiten klicken.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {filledFields.map(def => (
          <div key={def.key}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{def.label}</p>
            <p className="text-sm text-slate-700 font-medium mt-0.5">
              {formatFieldValue(def, fields[def.key])}
            </p>
          </div>
        ))}
      </div>
      {notes && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notizen</p>
          <p className="text-xs text-slate-600 whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function ProductEditForm({
  product, fieldDefs, onSave, onCancel,
}: {
  product: InsuranceProduct;
  fieldDefs: FieldDef[];
  onSave: (fields: Record<string, string>, notes: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => parseFields(product.fields));
  const [notes, setNotes]   = useState(product.notes || "");
  const [saving, setSaving] = useState(false);

  function set(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    await onSave(values, notes);
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fieldDefs.map(def => (
          <div key={def.key} className={def.type === "boolean" ? "flex items-center gap-2" : ""}>
            {def.type === "boolean" ? (
              <>
                <button
                  type="button"
                  onClick={() => set(def.key, values[def.key] === "true" ? "false" : "true")}
                  className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${
                    values[def.key] === "true" ? "bg-lime-500" : "bg-slate-200"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    values[def.key] === "true" ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </button>
                <label className="text-xs font-medium text-slate-600">{def.label}</label>
              </>
            ) : def.type === "select" ? (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{def.label}</label>
                <select
                  value={values[def.key] || ""}
                  onChange={e => set(def.key, e.target.value)}
                  className="input text-sm py-2"
                >
                  <option value="">Bitte wählen...</option>
                  {def.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{def.label}</label>
                <input
                  type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                  value={values[def.key] || ""}
                  onChange={e => set(def.key, e.target.value)}
                  placeholder={def.placeholder}
                  className="input text-sm py-2"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Notizen (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Zusätzliche Informationen..."
          className="input resize-none text-sm py-2"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary py-1.5 text-xs">
          <X className="w-3.5 h-3.5" /> Abbrechen
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary py-1.5 text-xs">
          {saving ? (
            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Speichern
        </button>
      </div>
    </div>
  );
}

// ── Add product modal ─────────────────────────────────────────────────────────

function AddProductModal({
  contactId, onClose, onCreated,
}: {
  contactId: string;
  onClose: () => void;
  onCreated: (p: InsuranceProduct) => void;
}) {
  const [step, setStep]       = useState<"type" | "fields">("type");
  const [type, setType]       = useState<string>("");
  const [values, setValues]   = useState<Record<string, string>>({});
  const [notes, setNotes]     = useState("");
  const [status, setStatus]   = useState("interessent");
  const [saving, setSaving]   = useState(false);

  const cfg = type ? PRODUCT_TYPES[type] : null;

  function set(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }));
  }

  async function create() {
    if (!type) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, status, fields: values, notes: notes || undefined }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data.product);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 w-full max-w-lg border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Neues Versicherungsprodukt</h2>
            <p className="text-xs text-slate-400">
              {step === "type" ? "Versicherungsart wählen" : `${cfg?.label} — Daten eintragen`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {step === "type" ? (
            /* Type selection grid */
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PRODUCT_TYPES).map(([key, c]) => {
                const Icon = c.icon;
                return (
                  <button
                    key={key}
                    onClick={() => { setType(key); setStep("fields"); }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-sm ${c.border} ${c.bg} hover:brightness-95`}
                  >
                    <div className={`w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${c.color}`} size={18} />
                    </div>
                    <span className={`text-sm font-bold ${c.color}`}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          ) : cfg ? (
            /* Fields form */
            <>
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                    <button
                      key={key}
                      onClick={() => setStatus(key)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                        status === key
                          ? `${s.bg} ${s.color} border-current`
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3">
                {cfg.fields.map(def => (
                  <div key={def.key} className={def.type === "boolean" ? "flex items-center gap-2 col-span-1" : ""}>
                    {def.type === "boolean" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => set(def.key, values[def.key] === "true" ? "false" : "true")}
                          className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${
                            values[def.key] === "true" ? "bg-lime-500" : "bg-slate-200"
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            values[def.key] === "true" ? "translate-x-4" : "translate-x-0.5"
                          }`} />
                        </button>
                        <label className="text-xs font-medium text-slate-600">{def.label}</label>
                      </>
                    ) : def.type === "select" ? (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{def.label}</label>
                        <select
                          value={values[def.key] || ""}
                          onChange={e => set(def.key, e.target.value)}
                          className="input text-sm py-2"
                        >
                          <option value="">Bitte wählen...</option>
                          {def.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{def.label}</label>
                        <input
                          type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                          value={values[def.key] || ""}
                          onChange={e => set(def.key, e.target.value)}
                          placeholder={def.placeholder}
                          className="input text-sm py-2"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Notizen <span className="normal-case font-normal text-slate-300">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Zusätzliche Informationen..."
                  className="input resize-none text-sm py-2"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {step === "fields" && (
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button onClick={() => setStep("type")} className="btn-secondary">
              Zurück
            </button>
            <button onClick={create} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : "Produkt speichern"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
