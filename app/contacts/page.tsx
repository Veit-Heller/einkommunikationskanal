"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ContactTable from "@/components/ContactTable";
import {
  Search,
  UserPlus,
  Upload,
  RefreshCw,
  Users,
  Mail,
  Phone,
  X,
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
  const [newContact, setNewContact] = useState<NewContactForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
  });
  const [saving, setSaving] = useState(false);

  // Get custom column names across all contacts
  const extraColumns = (() => {
    const cols = new Set<string>();
    for (const c of contacts) {
      if (c.customFields) {
        try {
          const parsed = JSON.parse(c.customFields);
          Object.keys(parsed).forEach((k) => cols.add(k));
        } catch {
          // ignore
        }
      }
    }
    return Array.from(cols).slice(0, 3); // max 3 extra columns shown
  })();

  // Debounce search
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
    if (!newContact.firstName && !newContact.lastName && !newContact.email) {
      return;
    }
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
        setNewContact({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          company: "",
        });
        router.push(`/contacts/${data.contact.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontakte</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contacts.length} Kontakte
            {searchDebounced ? ` · Suche: "${searchDebounced}"` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/import")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Excel importieren
          </button>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Neuer Kontakt
          </button>
        </div>
      </div>

      {/* New contact modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Neuer Kontakt
              </h2>
              <button
                onClick={() => setShowNewForm(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={newContact.firstName}
                    onChange={(e) =>
                      setNewContact({ ...newContact, firstName: e.target.value })
                    }
                    placeholder="Max"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={newContact.lastName}
                    onChange={(e) =>
                      setNewContact({ ...newContact, lastName: e.target.value })
                    }
                    placeholder="Mustermann"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />
                  E-Mail
                </label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                  placeholder="max@beispiel.de"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />
                  Telefon / WhatsApp
                </label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                  placeholder="+49 170 1234567"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Unternehmen
                </label>
                <input
                  type="text"
                  value={newContact.company}
                  onChange={(e) =>
                    setNewContact({ ...newContact, company: e.target.value })
                  }
                  placeholder="Muster GmbH"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={createContact}
                disabled={
                  saving ||
                  (!newContact.firstName &&
                    !newContact.lastName &&
                    !newContact.email)
                }
                className="flex-1 px-4 py-2 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Speichert..." : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-blue-600" size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {contacts.length}
              </div>
              <div className="text-xs text-gray-500">Gesamt</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <Phone className="w-4.5 h-4.5 text-green-600" size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {contacts.filter((c) => c.phone).length}
              </div>
              <div className="text-xs text-gray-500">Mit WhatsApp</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Mail className="w-4.5 h-4.5 text-blue-600" size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {contacts.filter((c) => c.email).length}
              </div>
              <div className="text-xs text-gray-500">Mit E-Mail</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Kontakte suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={loadContacts}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Laden...
          </div>
        ) : (
          <ContactTable
            contacts={contacts}
            onDelete={deleteContact}
            extraColumns={extraColumns}
          />
        )}
      </div>
    </div>
  );
}
