"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  MessageCircle,
  Users,
  Loader2,
  AlertCircle,
  Eye,
  CheckSquare,
  Square,
} from "lucide-react";

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
    icon: MessageCircle,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    active: "bg-green-600 border-green-600 text-white",
  },
  {
    value: "email",
    label: "E-Mail",
    icon: Mail,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    active: "bg-blue-600 border-blue-600 text-white",
  },
  {
    value: "both",
    label: "Beide Kanäle",
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    active: "bg-purple-600 border-purple-600 text-white",
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

export default function CampaignForm({ contacts }: CampaignFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [template, setTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(contacts.map((c) => c.id))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [previewContact, setPreviewContact] = useState<Contact | null>(
    contacts[0] || null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredContacts = contacts.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  function toggleContact(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  async function saveCampaign(send = false) {
    if (!name.trim()) {
      setError("Bitte geben Sie einen Kampagnennamen ein.");
      return;
    }
    if (!template.trim()) {
      setError("Bitte geben Sie eine Nachrichtenvorlage ein.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Bitte wählen Sie mindestens einen Empfänger.");
      return;
    }
    if ((channel === "email" || channel === "both") && !subject.trim()) {
      setError("Bitte geben Sie einen E-Mail-Betreff ein.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          channel,
          template,
          subject: subject || null,
          contactIds: Array.from(selectedIds),
          send,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Speichern");
      }

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
        {/* Name */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Kampagnendetails</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kampagnenname *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Herbst-Newsletter 2024"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            {/* Channel selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kanal *
              </label>
              <div className="flex gap-3">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  const isActive = channel === ch.value;
                  return (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        isActive ? ch.active : `${ch.bg} ${ch.color}`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Template */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Nachrichtenvorlage</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Vorschau ausblenden" : "Vorschau"}
            </button>
          </div>

          {/* Variables hint */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-amber-700 font-medium mb-1">
              Verfügbare Variablen:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["{{vorname}}", "{{nachname}}", "{{name}}", "{{email}}", "{{telefon}}"].map(
                (v) => (
                  <button
                    key={v}
                    onClick={() => setTemplate((t) => t + v)}
                    className="font-mono text-xs bg-amber-100 border border-amber-300 rounded px-2 py-0.5 text-amber-800 hover:bg-amber-200 transition-colors"
                  >
                    {v}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Email subject */}
          {(channel === "email" || channel === "both") && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-Mail Betreff *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff der E-Mail..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nachrichtentext *
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={8}
              placeholder={`Hallo {{vorname}},\n\nIch möchte Sie auf unsere aktuellen Versicherungsangebote aufmerksam machen...\n\nMit freundlichen Grüßen`}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Preview */}
          {showPreview && previewContact && template && (
            <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Vorschau für{" "}
                {[previewContact.firstName, previewContact.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              {subject && (channel === "email" || channel === "both") && (
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Betreff: {replaceVariables(subject, previewContact)}
                </p>
              )}
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                {replaceVariables(template, previewContact)}
              </pre>
              {contacts.length > 1 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="text-xs text-gray-500">
                    Vorschau für anderen Kontakt:
                  </label>
                  <select
                    value={previewContact.id}
                    onChange={(e) => {
                      const c = contacts.find((x) => x.id === e.target.value);
                      if (c) setPreviewContact(c);
                    }}
                    className="ml-2 text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") ||
                          c.email ||
                          c.id.slice(0, 8)}
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
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/campaigns")}
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => saveCampaign(false)}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Als Entwurf speichern
            </button>
            <button
              onClick={() => saveCampaign(true)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Kampagne starten
            </button>
          </div>
        </div>
      </div>

      {/* Right: Recipients */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Empfänger</h2>
          <span className="text-sm text-blue-600 font-medium">
            {selectedIds.size} / {contacts.length}
          </span>
        </div>

        <div className="mb-3">
          <input
            type="text"
            placeholder="Kontakte suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        <button
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3 w-full py-1"
        >
          {selectedIds.size === contacts.length ? (
            <CheckSquare className="w-4 h-4 text-blue-500" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
          Alle auswählen
        </button>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredContacts.map((contact) => {
            const isSelected = selectedIds.has(contact.id);
            return (
              <button
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {[contact.firstName, contact.lastName]
                      .filter(Boolean)
                      .join(" ") || (
                      <span className="text-gray-400 italic">Kein Name</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
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
