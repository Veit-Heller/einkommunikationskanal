"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ContactTable from "@/components/ContactTable";
import TemplateModal from "@/components/TemplateModal";
import {
  Search,
  UserPlus,
  RefreshCw,
  Users,
  Mail,
  Phone,
  X,
  LayoutGrid,
  List,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  createdAt: string;
  customFields: string | null;
}

interface NewContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [newContact, setNewContact] = useState<NewContactForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
  });
  const [saving, setSaving] = useState(false);
  const [templateModal, setTemplateModal] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const extraColumns = (() => {
    const cols = new Set<string>();
    for (const c of contacts) {
      if (c.customFields) {
        try {
          const parsed = JSON.parse(c.customFields);
          Object.keys(parsed).forEach((k) => cols.add(k));
        } catch { /* ignore */ }
      }
    }
    return Array.from(cols).slice(0, 3);
  })();

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = searchDebounced
        ? `?search=${encodeURIComponent(searchDebounced)}`
        : "";
      const res = await fetch(`/api/contacts${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  async function deleteContact(id: string) {
    if (!confirm("Kontakt wirklich löschen?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function createContact() {
    if (!newContact.firstName && !newContact.lastName && !newContact.email) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      if (res.ok) {
        setContacts((prev) => [data.contact, ...prev]);
        setShowNewForm(false);
        setNewContact({ firstName: "", lastName: "", email: "", phone: "", company: "" });
        if (data.contact.phone) {
          const fullName =
            [data.contact.firstName, data.contact.lastName].filter(Boolean).join(" ") ||
            data.contact.email ||
            "Kontakt";
          setTemplateModal({ id: data.contact.id, name: fullName, phone: data.contact.phone });
        } else {
          router.push(`/contacts/${data.contact.id}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const withPhone = contacts.filter((c) => c.phone).length;
  const withEmail = contacts.filter((c) => c.email).length;

  return (
    <div className="min-h-full bg-slate-50">
      {/* ── Top header bar ─────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title + stats */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Kontakte</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Alle Kunden &amp; Interessenten
              </p>
            </div>

            {/* Inline stats pills */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
                <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Users size={11} className="text-slate-500" />
                </div>
                <span className="text-sm font-bold text-slate-800">{contacts.length}</span>
                <span className="text-xs text-slate-400">Gesamt</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <MessageCircle size={11} className="text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-emerald-700">{withPhone}</span>
                <span className="text-xs text-emerald-500">WhatsApp</span>
              </div>
              <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-1.5">
                <div className="w-5 h-5 bg-sky-100 rounded-lg flex items-center justify-center">
                  <Mail size={11} className="text-sky-600" />
                </div>
                <span className="text-sm font-bold text-sky-700">{withEmail}</span>
                <span className="text-xs text-sky-500">E-Mail</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Kachelansicht"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-white text-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Listenansicht"
              >
                <List size={15} />
              </button>
            </div>

            <button
              onClick={() => setShowNewForm(true)}
              className="btn-primary"
            >
              <UserPlus className="w-4 h-4" />
              Neuer Kontakt
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 max-w-sm focus-within:border-lime-400 focus-within:ring-2 focus-within:ring-lime-400/20 transition-all">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Name, E-Mail oder Unternehmen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700 placeholder-slate-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={loadContacts}
            className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {searchDebounced && (
            <p className="text-xs text-slate-400">
              {contacts.length} Ergebnis{contacts.length !== 1 ? "se" : ""} für &ldquo;{searchDebounced}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────── */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Lade Kontakte...</span>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          contacts.length === 0 ? (
            <EmptyState onAdd={() => setShowNewForm(true)} searched={!!searchDebounced} />
          ) : (
            <ContactTable
              contacts={contacts}
              onDelete={deleteContact}
              extraColumns={extraColumns}
              viewMode="grid"
            />
          )
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <ContactTable
              contacts={contacts}
              onDelete={deleteContact}
              extraColumns={extraColumns}
              viewMode="table"
            />
          </div>
        )}
      </div>

      {/* ── WhatsApp template modal ─────────────────────────── */}
      {templateModal && (
        <TemplateModal
          contactId={templateModal.id}
          contactName={templateModal.name}
          contactPhone={templateModal.phone}
          onClose={() => {
            setTemplateModal(null);
            router.push(`/contacts/${templateModal.id}`);
          }}
          onSent={() => {
            setTemplateModal(null);
            router.push(`/contacts/${templateModal.id}`);
          }}
        />
      )}

      {/* ── New contact modal ────────────────────────────────── */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 w-full max-w-md border border-slate-100">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-lime-50 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-4.5 h-4.5 text-lime-600" size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Neuer Kontakt</h2>
                  <p className="text-xs text-slate-400">Felder ausfüllen und speichern</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewForm(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Vorname</label>
                  <input
                    type="text"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    placeholder="Max"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nachname</label>
                  <input
                    type="text"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    placeholder="Mustermann"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Mail size={11} /> E-Mail
                </label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="max@beispiel.de"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Phone size={11} /> Telefon / WhatsApp
                </label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+49 170 1234567"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Unternehmen</label>
                <input
                  type="text"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  placeholder="Muster GmbH"
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowNewForm(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Abbrechen
              </button>
              <button
                onClick={createContact}
                disabled={saving || (!newContact.firstName && !newContact.lastName && !newContact.email)}
                className="btn-primary flex-1 justify-center"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Speichert...
                  </>
                ) : (
                  "Erstellen"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd, searched }: { onAdd: () => void; searched: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
        {searched ? (
          <Search className="w-9 h-9 text-slate-300" />
        ) : (
          <TrendingUp className="w-9 h-9 text-slate-300" />
        )}
      </div>
      <h3 className="font-bold text-slate-700 text-lg mb-1">
        {searched ? "Keine Ergebnisse" : "Noch keine Kontakte"}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs mb-6">
        {searched
          ? "Versuche es mit einem anderen Suchbegriff."
          : "Legen Sie Ihren ersten Kontakt an oder importieren Sie eine Excel-Datei."}
      </p>
      {!searched && (
        <button onClick={onAdd} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Ersten Kontakt anlegen
        </button>
      )}
    </div>
  );
}
