"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MessageTimeline from "@/components/MessageTimeline";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  FileText,
  Edit3,
  Save,
  X,
  Loader2,
  User,
  Calendar,
  Hash,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  customFields: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface Message {
  id: string;
  createdAt: string;
  channel: string;
  direction: string;
  content: string;
  subject: string | null;
  status: string | null;
  sentAt: string | null;
}

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contacts/${params.id}`);
        if (!res.ok) {
          router.push("/contacts");
          return;
        }
        const data = await res.json();
        setContact(data.contact);
        setEditData(data.contact);
      } catch {
        router.push("/contacts");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  async function saveContact() {
    if (!contact) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editData.firstName,
          lastName: editData.lastName,
          email: editData.email,
          phone: editData.phone,
          company: editData.company,
          notes: editData.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setContact({ ...contact, ...data.contact });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditData(contact || {});
    setEditing(false);
  }

  function getInitials(c: Contact) {
    return (
      [c.firstName?.charAt(0), c.lastName?.charAt(0)]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "?"
    );
  }

  function getCustomFields(c: Contact): Record<string, string> {
    if (!c.customFields) return {};
    try {
      return JSON.parse(c.customFields);
    } catch {
      return {};
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!contact) return null;

  const customFields = getCustomFields(contact);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-100">
        <button
          onClick={() => router.push("/contacts")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
            {getInitials(contact)}
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 leading-tight">
              {[contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                "Kein Name"}
            </h1>
            <p className="text-xs text-gray-400 leading-tight">
              {contact.company || "Kein Unternehmen"} ·{" "}
              {formatDistanceToNow(new Date(contact.createdAt), {
                addSuffix: true,
                locale: de,
              })}{" "}
              erstellt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Bearbeiten
            </button>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="w-3.5 h-3.5" />
                Abbrechen
              </button>
              <button
                onClick={saveContact}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Speichern
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-0 overflow-hidden min-h-0">
        {/* Left: Contact info */}
        <div className="w-72 xl:w-80 flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
          <div className="p-5 space-y-6">
            {/* Core fields */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Kontaktdaten
              </h3>
              <div className="space-y-3">
                {/* First name */}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Vorname
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.firstName || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, firstName: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">
                      {contact.firstName || (
                        <span className="text-gray-300 font-normal italic">
                          Kein Vorname
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Last name */}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Nachname
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.lastName || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, lastName: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">
                      {contact.lastName || (
                        <span className="text-gray-300 font-normal italic">
                          Kein Nachname
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> E-Mail
                  </label>
                  {editing ? (
                    <input
                      type="email"
                      value={editData.email || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  ) : contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-sm text-blue-600 hover:underline truncate block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.email}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-300 italic">Keine E-Mail</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Telefon / WhatsApp
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editData.phone || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, phone: e.target.value })
                      }
                      placeholder="+49 170 1234567"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  ) : contact.phone ? (
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {contact.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-300 italic">
                      Kein Telefon
                    </p>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Unternehmen
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.company || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, company: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">
                      {contact.company || (
                        <span className="text-gray-300 font-normal italic">
                          Kein Unternehmen
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Notizen
              </h3>
              {editing ? (
                <textarea
                  value={editData.notes || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, notes: e.target.value })
                  }
                  rows={4}
                  placeholder="Notizen zum Kontakt..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {contact.notes || (
                    <span className="text-gray-300 italic">Keine Notizen</span>
                  )}
                </p>
              )}
            </div>

            {/* Custom fields */}
            {Object.keys(customFields).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Benutzerdefinierte Felder
                </h3>
                <div className="space-y-2">
                  {Object.entries(customFields).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-0.5">
                        {key}
                      </label>
                      <p className="text-sm text-gray-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Erstellt{" "}
                  {new Date(contact.createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Message Timeline */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-600">
              Kommunikationshistorie
            </h2>
            <p className="text-xs text-gray-400">
              {contact.messages.length} Nachrichten · E-Mail & WhatsApp
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <MessageTimeline
              contact={contact}
              initialMessages={contact.messages}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
