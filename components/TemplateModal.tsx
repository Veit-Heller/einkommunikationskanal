"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, CheckCircle } from "lucide-react";

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
    // Count variables in body
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
    variables.forEach((v, i) => {
      body = body.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`);
    });
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
      if (!res.ok) {
        setError(data.error || "Fehler beim Senden");
        return;
      }
      setSent(true);
      setTimeout(onSent, 1500);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">WhatsApp senden</h2>
              <p className="text-xs text-gray-400">{contactName} · {contactPhone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {sent ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">Nachricht gesendet!</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Templates laden...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>Keine genehmigten Templates gefunden.</p>
              <p className="mt-1 text-xs">Erstelle Templates im WhatsApp Manager und warte auf Genehmigung.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Template selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Template auswählen</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                        selectedTemplate?.id === t.id
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{t.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.language}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{getBodyText(t)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Variables */}
              {selectedTemplate && variables.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Variablen ausfüllen</label>
                  <div className="space-y-2">
                    {variables.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-8 shrink-0">{`{{${i+1}}}`}</span>
                        <input
                          type="text"
                          value={v}
                          onChange={e => {
                            const next = [...variables];
                            next[i] = e.target.value;
                            setVariables(next);
                          }}
                          placeholder={`Variable ${i+1}`}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {selectedTemplate && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Vorschau</label>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                    {getPreview()}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Überspringen
            </button>
            {!loading && !error && templates.length > 0 && (
              <button
                onClick={sendTemplate}
                disabled={!selectedTemplate || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 rounded-xl text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Jetzt senden
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
