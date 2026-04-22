"use client";

import { useState, useEffect, useCallback } from "react";
import ContactTable from "@/components/ContactTable";
import TemplateModal from "@/components/TemplateModal";
import ContactDrawer from "@/components/ContactDrawer";
import PageHeader from "@/components/PageHeader";
import { Icon } from "@iconify/react";

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#FFFFFF",
  padding: "10px 16px",
  fontSize: "14px",
  outline: "none",
  transition: "all 150ms ease",
};

const gradientBorderCard = {
  padding: "1px",
  borderRadius: "12px",
  background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 12px)",
  boxShadow: "rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.1) 0px 8px 10px -6px, rgba(0,0,0,0.25) 0px 25px 50px -12px",
};

export default function ContactsPage() {
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
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);
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
          setDrawerContactId(data.contact.id);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const withPhone = contacts.filter((c) => c.phone).length;
  const withEmail = contacts.filter((c) => c.email).length;

  return (
    <div className="min-h-full" style={{ background: "#111111" }}>
      <PageHeader
        title="Kontakte"
        subtitle="Alle Kunden & Interessenten"
        actions={
          <>
            {/* Stats pills */}
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon icon="solar:users-group-rounded-linear" style={{ color: "rgba(255,255,255,0.4)", width: 11, height: 11 }} />
                <span className="text-sm font-bold" style={{ color: "#FFFFFF" }}>{contacts.length}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Gesamt</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon icon="solar:chat-round-line-linear" style={{ color: "#F2EAD3", width: 11, height: 11 }} />
                <span className="text-sm font-bold" style={{ color: "#F2EAD3" }}>{withPhone}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>WhatsApp</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon icon="solar:letter-linear" style={{ color: "#1B77BA", width: 11, height: 11 }} />
                <span className="text-sm font-bold" style={{ color: "#1B77BA" }}>{withEmail}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>E-Mail</span>
              </div>
            </div>
            {/* View toggle */}
            <div
              className="flex items-center rounded-xl p-0.5"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={() => setViewMode("grid")}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: viewMode === "grid" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: viewMode === "grid" ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                }}
                title="Kachelansicht"
              >
                <Icon icon="solar:widget-2-linear" style={{ width: 15, height: 15 }} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: viewMode === "table" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: viewMode === "table" ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                }}
                title="Listenansicht"
              >
                <Icon icon="solar:list-linear" style={{ width: 15, height: 15 }} />
              </button>
            </div>
            <a
              href="/import"
              className="flex items-center gap-1.5 font-semibold text-sm"
              style={{
                background: "#1B77BA",
                color: "#FFFFFF",
                borderRadius: "9999px",
                padding: "10px 20px",
                border: "1px solid rgba(27,119,186,0.5)",
                transition: "all 150ms ease",
              }}
            >
              <Icon icon="solar:upload-linear" style={{ width: 16, height: 16 }} />
              Importieren
            </a>
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-1.5 font-semibold text-sm"
              style={{
                background: "#F2EAD3",
                color: "#000000",
                borderRadius: "9999px",
                padding: "8px 20px",
                border: "none",
                transition: "all 150ms ease",
              }}
            >
              <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
              Neuer Kontakt
            </button>
          </>
        }
      >
        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-3.5 py-2.5 max-w-sm"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              transition: "all 150ms ease",
            }}
          >
            <Icon icon="solar:magnifer-linear" style={{ color: "rgba(255,255,255,0.4)", width: 16, height: 16, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Name, E-Mail oder Unternehmen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: "#FFFFFF" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "rgba(255,255,255,0.4)" }}>
                <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <button
            onClick={loadContacts}
            className="p-2.5 rounded-xl transition-all"
            style={{
              color: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              transition: "all 150ms ease",
            }}
            title="Aktualisieren"
          >
            <Icon icon="solar:refresh-linear" style={{ width: 16, height: 16 }} />
          </button>
          {searchDebounced && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {contacts.length} Ergebnis{contacts.length !== 1 ? "se" : ""} für &ldquo;{searchDebounced}&rdquo;
            </p>
          )}
        </div>
      </PageHeader>

      {/* Main content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 rounded-full animate-spin"
                style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }}
              />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Lade Kontakte...</span>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          contacts.length === 0 ? (
            <EmptyState onAdd={() => setShowNewForm(true)} searched={!!searchDebounced} />
          ) : (
            <ContactTable
              contacts={contacts}
              onDelete={deleteContact}
              onContactClick={setDrawerContactId}
              extraColumns={extraColumns}
              viewMode="grid"
            />
          )
        ) : (
          <div
            style={{
              ...gradientBorderCard,
              borderRadius: "12px",
            }}
          >
            <div style={{ borderRadius: "11px", background: "#1C1C1C", overflow: "hidden" }}>
              <ContactTable
                contacts={contacts}
                onDelete={deleteContact}
                onContactClick={setDrawerContactId}
                extraColumns={extraColumns}
                viewMode="table"
              />
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp template modal */}
      {templateModal && (
        <TemplateModal
          contactId={templateModal.id}
          contactName={templateModal.name}
          contactPhone={templateModal.phone}
          onClose={() => {
            setTemplateModal(null);
            setDrawerContactId(templateModal.id);
          }}
          onSent={() => {
            setTemplateModal(null);
            setDrawerContactId(templateModal.id);
          }}
        />
      )}

      {/* New contact modal */}
      {showNewForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            style={{
              ...gradientBorderCard,
              width: "100%",
              maxWidth: "448px",
              borderRadius: "16px",
            }}
          >
            <div style={{ borderRadius: "15px", background: "#1C1C1C" }}>
              {/* Modal header */}
              <div
                className="flex items-center justify-between px-6 pt-6 pb-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(242,234,211,0.1)" }}
                  >
                    <Icon icon="solar:user-linear" style={{ color: "#F2EAD3", width: 18, height: 18 }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: "#FFFFFF", fontWeight: 400 }}>Neuer Kontakt</h2>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Felder ausfüllen und speichern</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)", background: "transparent" }}
                >
                  <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Vorname</label>
                    <input
                      type="text"
                      value={newContact.firstName}
                      onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                      placeholder="Max"
                      style={inputStyle}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Nachname</label>
                    <input
                      type="text"
                      value={newContact.lastName}
                      onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                      placeholder="Mustermann"
                      style={inputStyle}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <Icon icon="solar:letter-linear" style={{ width: 11, height: 11 }} /> E-Mail
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="max@beispiel.de"
                    style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <Icon icon="solar:phone-linear" style={{ width: 11, height: 11 }} /> Telefon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+49 170 1234567"
                    style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Unternehmen</label>
                  <input
                    type="text"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    placeholder="Muster GmbH"
                    style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                </div>
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 flex items-center justify-center font-semibold text-sm"
                  style={{
                    background: "#1B77BA",
                    color: "#FFFFFF",
                    borderRadius: "9999px",
                    padding: "10px 32px",
                    border: "1px solid rgba(27,119,186,0.5)",
                    transition: "all 150ms ease",
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={createContact}
                  disabled={saving || (!newContact.firstName && !newContact.lastName && !newContact.email)}
                  className="flex-1 flex items-center justify-center gap-2 font-semibold text-sm"
                  style={{
                    background: "#F2EAD3",
                    color: "#000000",
                    borderRadius: "9999px",
                    padding: "8px 20px",
                    border: "none",
                    opacity: (saving || (!newContact.firstName && !newContact.lastName && !newContact.email)) ? 0.5 : 1,
                    transition: "all 150ms ease",
                  }}
                >
                  {saving ? (
                    <>
                      <div
                        className="w-3.5 h-3.5 rounded-full animate-spin"
                        style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }}
                      />
                      Speichert...
                    </>
                  ) : (
                    "Erstellen"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact drawer */}
      {drawerContactId && (
        <ContactDrawer
          contactId={drawerContactId}
          onClose={() => setDrawerContactId(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd, searched }: { onAdd: () => void; searched: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <Icon
          icon={searched ? "solar:magnifer-linear" : "solar:users-group-rounded-linear"}
          style={{ color: "rgba(255,255,255,0.2)", width: 36, height: 36 }}
        />
      </div>
      <h3 className="font-semibold text-lg mb-1" style={{ color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>
        {searched ? "Keine Ergebnisse" : "Noch keine Kontakte"}
      </h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
        {searched
          ? "Versuche es mit einem anderen Suchbegriff."
          : "Legen Sie Ihren ersten Kontakt an oder importieren Sie eine Excel-Datei."}
      </p>
      {!searched && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 font-semibold text-sm"
          style={{
            background: "#F2EAD3",
            color: "#000000",
            borderRadius: "9999px",
            padding: "8px 20px",
            border: "none",
            transition: "all 150ms ease",
          }}
        >
          <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
          Ersten Kontakt anlegen
        </button>
      )}
    </div>
  );
}
