"use client";

import { useState, useEffect, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import { DEFAULT_TEMPLATES } from "@/lib/automation-templates";
import { Icon } from "@iconify/react";

type Templates = typeof DEFAULT_TEMPLATES;
type TemplateKey = keyof Templates;

const AUTOMATIONS: Array<{
  key: TemplateKey;
  iconName: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  trigger: string;
  triggerColor: string;
  triggerBg: string;
  vars: string[];
}> = [
  {
    key: "portalLink",
    iconName: "solar:send-linear",
    iconColor: "#F2EAD3",
    iconBg: "rgba(242,234,211,0.1)",
    title: "Portal-Link senden",
    subtitle: 'Wird gesendet, wenn du auf "Portal-Link senden" klickst.',
    trigger: "Manuell",
    triggerColor: "var(--text-secondary)",
    triggerBg: "var(--border)",
    vars: ["{{vorname}}", "{{titel}}", "{{portalLink}}", "{{maklername}}"],
  },
  {
    key: "reminder",
    iconName: "solar:bell-linear",
    iconColor: "rgba(251,191,36,1)",
    iconBg: "rgba(251,191,36,0.1)",
    title: "Erinnerung",
    subtitle: 'Wird gesendet wenn du "Erinnern" klickst oder der Cron automatisch erinnert (nach 3 bzw. 4 Tagen).',
    trigger: "Manuell + Automatisch",
    triggerColor: "rgba(251,191,36,1)",
    triggerBg: "rgba(251,191,36,0.1)",
    vars: ["{{vorname}}", "{{titel}}", "{{portalLink}}", "{{maklername}}"],
  },
  {
    key: "partial",
    iconName: "solar:danger-triangle-linear",
    iconColor: "rgba(251,146,60,1)",
    iconBg: "rgba(251,146,60,0.1)",
    title: "Teilweise eingereicht",
    subtitle: "Kunde schickt ab, aber hat noch nicht alles hochgeladen.",
    trigger: "Automatisch (Kundenportal)",
    triggerColor: "rgba(251,146,60,1)",
    triggerBg: "rgba(251,146,60,0.1)",
    vars: ["{{vorname}}", "{{titel}}", "{{maklername}}", "{{uploadedCount}}", "{{missingList}}"],
  },
  {
    key: "completion",
    iconName: "solar:check-circle-linear",
    iconColor: "rgba(52,211,153,1)",
    iconBg: "rgba(52,211,153,0.1)",
    title: "Abschluss-Nachricht",
    subtitle: 'Wird gesendet, wenn du einen Vorgang auf "Abgeschlossen" setzt.',
    trigger: "Manuell",
    triggerColor: "rgba(52,211,153,1)",
    triggerBg: "rgba(52,211,153,0.1)",
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

const gradientBorderCard = {
  padding: "1px",
  borderRadius: "12px",
  background: "var(--gradient-border)",
  boxShadow: "rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.1) 0px 8px 10px -6px",
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
      <div className="flex items-center justify-center h-full" style={{ background: "var(--bg)" }}>
        <div
          className="w-6 h-6 rounded-full animate-spin"
          style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      <PageHeader
        title="Automatisierungen"
        subtitle="Nachrichten-Vorlagen für automatische und manuelle Aktionen"
      />

      <div className="p-6 max-w-3xl space-y-6">

        {/* Message templates */}
        {AUTOMATIONS.map(a => {
          const isSaving = saving === a.key;
          const isSaved  = saved  === a.key;
          const isDirty  = templates[a.key] !== DEFAULT_TEMPLATES[a.key];

          return (
            <div key={a.key} style={gradientBorderCard}>
              <div style={{ borderRadius: "11px", background: "var(--surface)", overflow: "hidden" }}>
                {/* Card header */}
                <div
                  className="flex items-start gap-4 px-5 pt-5 pb-4"
                  style={{ borderBottom: "1px solid var(--sidebar-border)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: a.iconBg }}
                  >
                    <Icon icon={a.iconName} style={{ color: a.iconColor, width: 20, height: 20 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{a.title}</h2>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: a.triggerBg, color: a.triggerColor }}
                      >
                        {a.trigger}
                      </span>
                      {isDirty && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(27,119,186,0.1)", color: "#1B77BA" }}
                        >
                          Geändert
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{a.subtitle}</p>
                  </div>
                </div>

                {/* Textarea */}
                <div className="px-5 pt-4">
                  <textarea
                    ref={el => { textareaRefs.current[a.key] = el; }}
                    value={templates[a.key]}
                    onChange={e => setTemplates(t => ({ ...t, [a.key]: e.target.value }))}
                    rows={8}
                    className="w-full font-mono text-xs leading-relaxed resize-none focus:outline-none"
                    style={{
                      background: "var(--surface-subtle)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      color: "var(--text-secondary)",
                      transition: "all 150ms ease",
                    }}
                    onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--border)"; }}
                  />
                </div>

                {/* Variable chips + actions */}
                <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: "var(--text-tertiary)" }}>Variablen</span>
                    {a.vars.map(v => (
                      <button
                        key={v}
                        onClick={() => insertVar(a.key, v)}
                        className="px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                          transition: "all 150ms ease",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(242,234,211,0.1)";
                          (e.currentTarget as HTMLElement).style.color = "#F2EAD3";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "var(--input-bg)";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <button
                        onClick={() => reset(a.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
                        style={{ color: "var(--text-secondary)", background: "transparent" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--input-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                      >
                        <Icon icon="solar:restart-linear" style={{ width: 14, height: 14 }} />
                        Zurücksetzen
                      </button>
                    )}
                    <button
                      onClick={() => save(a.key)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: isSaved ? "rgba(52,211,153,0.15)" : "#F2EAD3",
                        color: isSaved ? "rgba(52,211,153,1)" : "#000000",
                        border: isSaved ? "1px solid rgba(52,211,153,0.3)" : "none",
                        transition: "all 150ms ease",
                      }}
                    >
                      {isSaving ? (
                        <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
                      ) : isSaved ? (
                        <Icon icon="solar:check-circle-linear" style={{ width: 14, height: 14 }} />
                      ) : (
                        <Icon icon="solar:diskette-linear" style={{ width: 14, height: 14 }} />
                      )}
                      {isSaved ? "Gespeichert" : "Speichern"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Cron info card */}
        <div style={gradientBorderCard}>
          <div style={{ borderRadius: "11px", background: "var(--surface)", overflow: "hidden" }}>
            <div
              className="flex items-start gap-4 px-5 pt-5 pb-4"
              style={{ borderBottom: "1px solid var(--sidebar-border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(167,139,250,0.1)" }}
              >
                <Icon icon="solar:clock-circle-linear" style={{ color: "rgba(167,139,250,1)", width: 20, height: 20 }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Automatische Erinnerungen (Cron)</h2>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(167,139,250,0.1)", color: "rgba(167,139,250,1)" }}
                  >
                    {CRON_INFO.schedule}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Der Text wird über die „Erinnerung"-Vorlage oben verschickt.
                </p>
              </div>
            </div>
            <ul className="px-5 py-4 space-y-2">
              {CRON_INFO.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span
                    className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "var(--border)", color: "var(--nav-text)" }}
                  >
                    {i + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
