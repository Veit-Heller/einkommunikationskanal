"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface Template {
  id: string;
  name: string;
  status: string;
  language: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
  }>;
}

interface TemplateModalProps {
  contactId: string;
  contactName: string;
  contactPhone: string;
  onClose: () => void;
  onSent: () => void;
}

export default function TemplateModal({
  contactId,
  contactName,
  contactPhone,
  onClose,
  onSent,
}: TemplateModalProps) {
  const [templates, setTemplates]             = useState<Template[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables]             = useState<string[]>([]);
  const [sending, setSending]                 = useState(false);
  const [sent, setSent]                       = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/templates")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setTemplates(data.templates || []);
      })
      .catch(() => setError("Templates konnten nicht geladen werden"))
      .finally(() => setLoading(false));
  }, []);

  function selectTemplate(t: Template) {
    setSelectedTemplate(t);
    const body = t.components.find(c => c.type === "BODY")?.text || "";
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    setVariables(new Array(matches.length).fill(""));
  }

  function getBodyText(t: Template): string {
    return t.components.find(c => c.type === "BODY")?.text || t.name;
  }

  function getPreview(): string {
    if (!selectedTemplate) return "";
    let body = getBodyText(selectedTemplate);
    variables.forEach((v, i) => { body = body.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`); });
    return body;
  }

  async function sendTemplate() {
    if (!selectedTemplate) return;
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/template-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          templateName: selectedTemplate.name,
          languageCode: selectedTemplate.language,
          bodyVariables: variables.filter(v => v.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Fehler beim Senden"); return; }
      setSent(true);
      setTimeout(onSent, 1500);
    } finally {
      setSending(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: 13,
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 150ms ease",
    width: "100%",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      {/* Gradient border shell */}
      <div
        style={{
          padding: "1px",
          borderRadius: "20px",
          background: "var(--gradient-border)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          width: "100%",
          maxWidth: 520,
        }}
      >
        <div style={{ borderRadius: "19px", background: "var(--surface)", overflow: "hidden" }}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--sidebar-border)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.1)" }}
              >
                <Icon icon="solar:chat-round-line-linear" style={{ color: "rgba(34,197,94,1)", width: 16, height: 16 }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>WhatsApp senden</h2>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{contactName} · {contactPhone}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)", background: "transparent", transition: "all 150ms ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div className="p-6">
            {sent ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(52,211,153,0.1)" }}
                >
                  <Icon icon="solar:check-circle-linear" style={{ color: "rgba(52,211,153,1)", width: 24, height: 24 }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Nachricht gesendet!</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--text-secondary)" }}>
                <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
                <span className="text-sm">Templates laden...</span>
              </div>
            ) : error ? (
              <div
                className="rounded-xl p-4 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
              >
                {error}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                <p>Keine genehmigten Templates gefunden.</p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>Erstelle Templates im WhatsApp Manager und warte auf Genehmigung.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Template selector */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Template auswählen</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t)}
                        className="w-full text-left px-3 py-2.5 rounded-xl transition-colors"
                        style={{
                          border: selectedTemplate?.id === t.id ? "1px solid rgba(34,197,94,0.5)" : "1px solid var(--border)",
                          background: selectedTemplate?.id === t.id ? "rgba(34,197,94,0.08)" : "var(--surface-subtle)",
                          transition: "all 150ms ease",
                        }}
                        onMouseEnter={e => { if (selectedTemplate?.id !== t.id) (e.currentTarget as HTMLElement).style.background = "var(--border)"; }}
                        onMouseLeave={e => { if (selectedTemplate?.id !== t.id) (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "var(--border)", color: "var(--text-secondary)" }}
                          >{t.language}</span>
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{getBodyText(t)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variables */}
                {selectedTemplate && variables.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Variablen ausfüllen</label>
                    <div className="space-y-2">
                      {variables.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs w-8 shrink-0 font-mono" style={{ color: "var(--text-tertiary)" }}>{`{{${i+1}}}`}</span>
                          <input
                            type="text"
                            value={v}
                            onChange={e => {
                              const next = [...variables];
                              next[i] = e.target.value;
                              setVariables(next);
                            }}
                            placeholder={`Variable ${i+1}`}
                            style={{ ...inputStyle, flex: 1 }}
                            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--input-border)"; }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview */}
                {selectedTemplate && (
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Vorschau</label>
                    <div
                      className="rounded-xl px-4 py-3 text-sm whitespace-pre-wrap"
                      style={{
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {getPreview()}
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    className="rounded-xl p-3 text-xs"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
                  >{error}</div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!sent && (
            <div
              className="flex gap-3 px-6 pb-6"
              style={{ borderTop: "1px solid var(--sidebar-border)", paddingTop: 16 }}
            >
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: "1px solid var(--input-border)", color: "var(--text-secondary)", background: "transparent", transition: "all 150ms ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--input-bg)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Überspringen
              </button>
              {!loading && templates.length > 0 && (
                <button
                  onClick={sendTemplate}
                  disabled={!selectedTemplate || sending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "rgba(34,197,94,0.9)",
                    color: "var(--text-primary)",
                    opacity: !selectedTemplate || sending ? 0.5 : 1,
                    transition: "all 150ms ease",
                  }}
                >
                  {sending
                    ? <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--border-strong)", borderTopColor: "var(--text-primary)" }} />
                    : <Icon icon="solar:arrow-up-linear" style={{ width: 16, height: 16 }} />}
                  Jetzt senden
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
