"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

interface CampaignFormProps {
  contacts: Contact[];
}

const CHANNELS = [
  {
    value: "whatsapp",
    label: "WhatsApp",
    iconName: "solar:chat-round-line-linear",
    activeColor: "rgba(34,197,94,1)",
    activeBg: "rgba(34,197,94,0.12)",
    activeBorder: "rgba(34,197,94,0.4)",
  },
  {
    value: "email",
    label: "E-Mail",
    iconName: "solar:letter-linear",
    activeColor: "rgba(91,166,219,1)",
    activeBg: "rgba(27,119,186,0.12)",
    activeBorder: "rgba(27,119,186,0.4)",
  },
  {
    value: "both",
    label: "Beide Kanäle",
    iconName: "solar:users-group-rounded-linear",
    activeColor: "rgba(167,139,250,1)",
    activeBg: "rgba(139,92,246,0.12)",
    activeBorder: "rgba(139,92,246,0.4)",
  },
];

function replaceVariables(template: string, contact: Contact): string {
  return template
    .replace(/\{\{vorname\}\}/gi, contact.firstName || "")
    .replace(/\{\{nachname\}\}/gi, contact.lastName || "")
    .replace(/\{\{name\}\}/gi, [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "")
    .replace(/\{\{email\}\}/gi, contact.email || "")
    .replace(/\{\{telefon\}\}/gi, contact.phone || "");
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "24px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  borderRadius: "10px",
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  transition: "border-color 150ms ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--nav-text)",
  marginBottom: 6,
};

export default function CampaignForm({ contacts }: CampaignFormProps) {
  const router = useRouter();
  const [name, setName]             = useState("");
  const [channel, setChannel]       = useState("whatsapp");
  const [template, setTemplate]     = useState("");
  const [subject, setSubject]       = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(contacts.map(c => c.id)));
  const [searchTerm, setSearchTerm] = useState("");
  const [previewContact, setPreviewContact] = useState<Contact | null>(contacts[0] || null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const filteredContacts = contacts.filter(c => {
    const q = searchTerm.toLowerCase();
    return !q || c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  function toggleContact(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === contacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map(c => c.id)));
  }

  async function saveCampaign(send = false) {
    if (!name.trim()) { setError("Bitte geben Sie einen Kampagnennamen ein."); return; }
    if (!template.trim()) { setError("Bitte geben Sie eine Nachrichtenvorlage ein."); return; }
    if (selectedIds.size === 0) { setError("Bitte wählen Sie mindestens einen Empfänger."); return; }
    if ((channel === "email" || channel === "both") && !subject.trim()) { setError("Bitte geben Sie einen E-Mail-Betreff ein."); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, channel, template, subject: subject || null, contactIds: Array.from(selectedIds), send }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Campaign details card */}
        <div style={cardStyle}>
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Kampagnendetails</h2>
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Kampagnenname *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Herbst-Newsletter 2024"
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--input-border)"; }}
              />
            </div>

            {/* Channel */}
            <div>
              <label style={labelStyle}>Kanal *</label>
              <div className="flex gap-3 flex-wrap">
                {CHANNELS.map(ch => {
                  const isActive = channel === ch.value;
                  return (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        border: isActive ? `1px solid ${ch.activeBorder}` : "1px solid var(--border)",
                        background: isActive ? ch.activeBg : "var(--surface-subtle)",
                        color: isActive ? ch.activeColor : "var(--nav-text)",
                        transition: "all 150ms ease",
                      }}
                    >
                      <Icon icon={ch.iconName} style={{ width: 16, height: 16 }} />
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Template card */}
        <div style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Nachrichtenvorlage</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "rgba(91,166,219,1)" }}
            >
              <Icon icon="solar:eye-linear" style={{ width: 16, height: 16 }} />
              {showPreview ? "Vorschau ausblenden" : "Vorschau"}
            </button>
          </div>

          {/* Variable hints */}
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}
          >
            <p className="text-xs font-medium mb-1.5" style={{ color: "rgba(251,191,36,0.8)" }}>Verfügbare Variablen:</p>
            <div className="flex flex-wrap gap-1.5">
              {["{{vorname}}", "{{nachname}}", "{{name}}", "{{email}}", "{{telefon}}"].map(v => (
                <button
                  key={v}
                  onClick={() => setTemplate(t => t + v)}
                  className="font-mono text-xs px-2 py-0.5 rounded transition-colors"
                  style={{
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.25)",
                    color: "rgba(251,191,36,0.9)",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)"; }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Email subject */}
          {(channel === "email" || channel === "both") && (
            <div className="mb-3">
              <label style={labelStyle}>E-Mail Betreff *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Betreff der E-Mail..."
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--input-border)"; }}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Nachrichtentext *</label>
            <textarea
              value={template}
              onChange={e => setTemplate(e.target.value)}
              rows={8}
              placeholder={`Hallo {{vorname}},\n\nIch möchte Sie auf unsere aktuellen Angebote aufmerksam machen...\n\nMit freundlichen Grüßen`}
              style={{ ...inputStyle, resize: "none", fontFamily: "monospace" }}
              onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
              onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--input-border)"; }}
            />
          </div>

          {/* Preview */}
          {showPreview && previewContact && template && (
            <div
              className="mt-4 rounded-xl p-4"
              style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-tertiary)" }}>
                Vorschau für {[previewContact.firstName, previewContact.lastName].filter(Boolean).join(" ")}
              </p>
              {subject && (channel === "email" || channel === "both") && (
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  Betreff: {replaceVariables(subject, previewContact)}
                </p>
              )}
              <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: "var(--text-secondary)" }}>
                {replaceVariables(template, previewContact)}
              </pre>
              {contacts.length > 1 && (
                <div
                  className="mt-3 pt-3"
                  style={{ borderTop: "1px solid var(--sidebar-border)" }}
                >
                  <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Vorschau für anderen Kontakt:
                  </label>
                  <select
                    value={previewContact.id}
                    onChange={e => {
                      const c = contacts.find(x => x.id === e.target.value);
                      if (c) setPreviewContact(c);
                    }}
                    className="ml-2 text-xs px-2 py-1 rounded"
                    style={{ background: "var(--border)", border: "1px solid var(--input-border)", color: "var(--text-primary)", outline: "none" }}
                  >
                    {contacts.map(c => (
                      <option key={c.id} value={c.id} style={{ background: "var(--surface)" }}>
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
          >
            <Icon icon="solar:danger-triangle-linear" style={{ width: 16, height: 16, flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/campaigns")}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ border: "1px solid var(--input-border)", color: "var(--text-secondary)", background: "transparent", transition: "all 150ms ease" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--input-bg)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Abbrechen
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => saveCampaign(false)}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                border: "1px solid var(--input-border)",
                color: "var(--text-secondary)",
                background: "transparent",
                opacity: saving ? 0.5 : 1,
                transition: "all 150ms ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--input-bg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              Als Entwurf speichern
            </button>
            <button
              onClick={() => saveCampaign(true)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#F2EAD3", color: "#000000", opacity: saving ? 0.7 : 1, transition: "all 150ms ease" }}
            >
              {saving && <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />}
              Kampagne starten
            </button>
          </div>
        </div>
      </div>

      {/* Right: Recipients */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Empfänger</h2>
          <span className="text-sm font-medium" style={{ color: "rgba(91,166,219,1)" }}>
            {selectedIds.size} / {contacts.length}
          </span>
        </div>

        <div className="mb-3">
          <input
            type="text"
            placeholder="Kontakte suchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={inputStyle}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--input-border)"; }}
          />
        </div>

        <button
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm w-full py-1 mb-3 transition-colors"
          style={{ color: "var(--nav-text)", background: "transparent" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--nav-text)"; }}
        >
          <Icon
            icon={selectedIds.size === contacts.length ? "solar:check-square-linear" : "solar:square-linear"}
            style={{ color: selectedIds.size === contacts.length ? "rgba(91,166,219,1)" : "var(--text-tertiary)", width: 16, height: 16 }}
          />
          Alle auswählen
        </button>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredContacts.map(contact => {
            const isSelected = selectedIds.has(contact.id);
            return (
              <button
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors"
                style={{
                  background: isSelected ? "rgba(27,119,186,0.08)" : "transparent",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon
                  icon={isSelected ? "solar:check-square-linear" : "solar:square-linear"}
                  style={{ color: isSelected ? "rgba(91,166,219,1)" : "var(--text-dim)", width: 16, height: 16, flexShrink: 0 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || (
                      <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>Kein Name</span>
                    )}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {contact.email || contact.phone || "Keine Kontaktdaten"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
