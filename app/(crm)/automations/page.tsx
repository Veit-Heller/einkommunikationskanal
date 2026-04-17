"use client";

import { useState, useEffect, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import { DEFAULT_TEMPLATES } from "@/lib/automation-templates";
import {
  Send, Bell, CheckCheck, AlertCircle,
  Clock, Save, Loader2, Check, RotateCcw,
} from "lucide-react";

type Templates = typeof DEFAULT_TEMPLATES;
type TemplateKey = keyof Templates;

const AUTOMATIONS: Array<{
  key: TemplateKey;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  trigger: string;
  triggerColor: string;
  vars: string[];
}> = [
  {
    key: "portalLink",
    icon: Send,
    iconColor: "text-lime-600",
    iconBg: "bg-lime-50",
    title: "Portal-Link senden",
    subtitle: 'Wird gesendet, wenn du auf "Portal-Link senden" klickst.',
    trigger: "Manuell",
    triggerColor: "bg-slate-100 text-slate-600",
    vars: ["{{vorname}}", "{{titel}}", "{{portalLink}}", "{{maklername}}"],
  },
  {
    key: "reminder",
    icon: Bell,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Erinnerung",
    subtitle: 'Wird gesendet wenn du "Erinnern" klickst oder der Cron automatisch erinnert (nach 3 bzw. 4 Tagen).',
    trigger: "Manuell + Automatisch",
    triggerColor: "bg-amber-50 text-amber-700",
    vars: ["{{vorname}}", "{{titel}}", "{{portalLink}}", "{{maklername}}"],
  },
  {
    key: "partial",
    icon: AlertCircle,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    title: "Teilweise eingereicht",
    subtitle: "Kunde schickt ab, aber hat noch nicht alles hochgeladen.",
    trigger: "Automatisch (Kundenportal)",
    triggerColor: "bg-orange-50 text-orange-700",
    vars: ["{{vorname}}", "{{titel}}", "{{maklername}}", "{{uploadedCount}}", "{{missingList}}"],
  },
  {
    key: "completion",
    icon: CheckCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Abschluss-Nachricht",
    subtitle: 'Wird gesendet, wenn du einen Vorgang auf "Abgeschlossen" setzt.',
    trigger: "Manuell",
    triggerColor: "bg-emerald-50 text-emerald-700",
    vars: ["{{vorname}}", "{{titel}}", "{{maklername}}"],
  },
];

const CRON_INFO = {
  schedule: "Täglich um 06:00 UTC",
  rules: [
    "1. Erinnerung: Kein Upload seit 3 Tagen nach Portal-Link-Versand",
    "2. Erinnerung: Keine Aktivität seit 4 Tagen nach 1. Erinnerung",
    "Maximal 2 automatische Erinnerungen pro Vorgang",
    "Nicht erinnert wenn Kunde kürzlich aktiv war",
  ],
};

export default function AutomationsPage() {
  const [templates, setTemplates] = useState<Templates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TemplateKey | null>(null);
  const [saved, setSaved] = useState<TemplateKey | null>(null);
  const textareaRefs = useRef<Partial<Record<TemplateKey, HTMLTextAreaElement | null>>>({});

  useEffect(() => {
    fetch("/api/automations/templates")
      .then(r => r.json())
      .then(d => { if (d.templates) setTemplates(d.templates); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function insertVar(key: TemplateKey, variable: string) {
    const el = textareaRefs.current[key];
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    const next  = el.value.slice(0, start) + variable + el.value.slice(end);
    setTemplates(t => ({ ...t, [key]: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    });
  }

  async function save(key: TemplateKey) {
    setSaving(key);
    try {
      await fetch("/api/automations/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 2500);
    } finally {
      setSaving(null);
    }
  }

  function reset(key: TemplateKey) {
    setTemplates(t => ({ ...t, [key]: DEFAULT_TEMPLATES[key] }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        title="Automatisierungen"
        subtitle="Nachrichten-Vorlagen für automatische und manuelle Aktionen"
      />

      <div className="p-6 max-w-3xl space-y-6">

        {/* Message templates */}
        {AUTOMATIONS.map(a => {
          const Icon = a.icon;
          const isSaving = saving === a.key;
          const isSaved  = saved  === a.key;
          const isDirty  = templates[a.key] !== DEFAULT_TEMPLATES[a.key];

          return (
            <div key={a.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-slate-50">
                <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${a.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900">{a.title}</h2>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.triggerColor}`}>
                      {a.trigger}
                    </span>
                    {isDirty && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        Geändert
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{a.subtitle}</p>
                </div>
              </div>

              {/* Textarea */}
              <div className="px-5 pt-4">
                <textarea
                  ref={el => { textareaRefs.current[a.key] = el; }}
                  value={templates[a.key]}
                  onChange={e => setTemplates(t => ({ ...t, [a.key]: e.target.value }))}
                  rows={8}
                  className="w-full font-mono text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent resize-none text-slate-700"
                />
              </div>

              {/* Variable chips + actions */}
              <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Variablen</span>
                  {a.vars.map(v => (
                    <button
                      key={v}
                      onClick={() => insertVar(a.key, v)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-lime-100 hover:text-lime-700 text-slate-600 font-mono text-[11px] transition-colors border border-slate-200 hover:border-lime-300"
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {isDirty && (
                    <button
                      onClick={() => reset(a.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Zurücksetzen
                    </button>
                  )}
                  <button
                    onClick={() => save(a.key)}
                    disabled={isSaving}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSaved
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-lime-500 text-white hover:bg-lime-600 shadow-sm shadow-lime-500/20"
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaved ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSaved ? "Gespeichert" : "Speichern"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Cron info card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Automatische Erinnerungen (Cron)</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                  {CRON_INFO.schedule}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Der Text wird über die „Erinnerung"-Vorlage oben verschickt.
              </p>
            </div>
          </div>
          <ul className="px-5 py-4 space-y-2">
            {CRON_INFO.rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
