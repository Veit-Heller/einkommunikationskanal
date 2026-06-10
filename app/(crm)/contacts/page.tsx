"use client";

import { useState, useEffect, useCallback } from "react";
import ContactTable from "@/components/ContactTable";
import TemplateModal from "@/components/TemplateModal";
import ContactDrawer from "@/components/ContactDrawer";
import PageHeader from "@/components/PageHeader";
import GroupModal, { ContactGroup } from "@/components/GroupModal";
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
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  borderRadius: "8px",
  color: "var(--text-primary)",
  padding: "10px 16px",
  fontSize: "14px",
  outline: "none",
  transition: "all 150ms ease",
};

const gradientBorderCard = {
  padding: "1px",
  borderRadius: "12px",
  background: "var(--gradient-border)",
  boxShadow: "rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.1) 0px 8px 10px -6px, rgba(0,0,0,0.25) 0px 25px 50px -12px",
};

export default function ContactsPage() {
  const [contacts, setContacts]               = useState<Contact[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showNewForm, setShowNewForm]         = useState(false);
  const [viewMode, setViewMode]               = useState<"grid" | "table">("grid");
  const [newContact, setNewContact]           = useState<NewContactForm>({
    firstName: "", lastName: "", email: "", phone: "", company: "",
  });
  const [saving, setSaving]                   = useState(false);
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);
  const [templateModal, setTemplateModal]     = useState<{ id: string; name: string; phone: string } | null>(null);

  // Groups state
  const [groups, setGroups]                   = useState<ContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal]   = useState(false);
  const [editingGroup, setEditingGroup]       = useState<ContactGroup | null>(null);
  const [showGroupMenu, setShowGroupMenu]     = useState<string | null>(null);
  const [groupsExpanded, setGroupsExpanded]   = useState(true);

  // Add members modal
  const [showAddMembers, setShowAddMembers]       = useState(false);
  const [addSearch, setAddSearch]                 = useState("");
  const [allContacts, setAllContacts]             = useState<Contact[]>([]);
  const [loadingAllContacts, setLoadingAllContacts] = useState(false);
  const [addingId, setAddingId]                   = useState<string | null>(null);

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
      const params: string[] = [];
      if (searchDebounced) params.push(`search=${encodeURIComponent(searchDebounced)}`);
      if (selectedGroupId)  params.push(`groupId=${selectedGroupId}`);
      const res = await fetch(`/api/contacts${params.length ? "?" + params.join("&") : ""}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, selectedGroupId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const loadGroups = useCallback(async () => {
    try {
      const res  = await fetch("/api/groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  async function openAddMembers() {
    setShowAddMembers(true);
    setAddSearch("");
    setLoadingAllContacts(true);
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      setAllContacts(data.contacts || []);
    } finally {
      setLoadingAllContacts(false);
    }
  }

  async function addMemberToGroup(contact: Contact) {
    if (!selectedGroupId) return;
    setAddingId(contact.id);
    try {
      await fetch(`/api/groups/${selectedGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [contact.id] }),
      });
      await Promise.all([loadContacts(), loadGroups()]);
    } finally {
      setAddingId(null);
    }
  }

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
            data.contact.email || "Kontakt";
          setTemplateModal({ id: data.contact.id, name: fullName, phone: data.contact.phone });
        } else {
          setDrawerContactId(data.contact.id);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm("Gruppe wirklich löschen?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
    setShowGroupMenu(null);
  }

  async function reapplyFilter(group: ContactGroup) {
    if (!group.filter) return;
    try {
      const rules = JSON.parse(group.filter);
      const res = await fetch(`/api/groups/${group.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const data = await res.json();
      await loadGroups();
      setShowGroupMenu(null);
      alert(`${data.added} Kontakte hinzugefügt.`);
    } catch { /* ignore */ }
  }

  const withPhone = contacts.filter((c) => c.phone).length;
  const withEmail = contacts.filter((c) => c.email).length;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>

      {/* ── Gruppen-Sidebar (Desktop) ── */}
      <div
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: 220,
          borderRight: "1px solid var(--border)",
          background: "var(--sidebar-bg)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <button
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setGroupsExpanded(!groupsExpanded)}
          >
            <Icon icon={groupsExpanded ? "solar:alt-arrow-down-linear" : "solar:alt-arrow-right-linear"} style={{ width: 11, height: 11 }} />
            Gruppen
          </button>
          <button
            onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
            className="p-1 rounded-lg transition-all"
            style={{ color: "var(--text-secondary)" }}
            title="Neue Gruppe"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            <Icon icon="solar:add-circle-linear" style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {groupsExpanded && (
          <nav className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
            {/* Alle Kontakte */}
            <button
              onClick={() => setSelectedGroupId(null)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
              style={{
                background: !selectedGroupId ? "var(--nav-active-bg)" : "transparent",
                color: !selectedGroupId ? "var(--nav-active-text)" : "var(--nav-text)",
              }}
            >
              <Icon icon="solar:users-group-rounded-linear" style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="flex-1">Alle Kontakte</span>
            </button>

            {/* Gruppen */}
            {groups.map((g) => (
              <div key={g.id} className="relative group/item">
                <button
                  onClick={() => setSelectedGroupId(g.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                  style={{
                    background: selectedGroupId === g.id ? "var(--nav-active-bg)" : "transparent",
                    color: selectedGroupId === g.id ? "var(--nav-active-text)" : "var(--nav-text)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                  <span className="flex-1 truncate">{g.emoji && `${g.emoji} `}{g.name}</span>
                  {g._count && <span className="text-[10px] opacity-60">{g._count.members}</span>}
                </button>
                {/* Kebab menu trigger */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowGroupMenu(showGroupMenu === g.id ? null : g.id); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Icon icon="solar:menu-dots-linear" style={{ width: 13, height: 13 }} />
                </button>
                {showGroupMenu === g.id && (
                  <div
                    className="absolute left-full top-0 ml-1 z-50 rounded-xl py-1 shadow-lg"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: 160 }}
                  >
                    <button
                      onClick={() => { setEditingGroup(g); setShowGroupModal(true); setShowGroupMenu(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all text-left"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Icon icon="solar:pen-linear" style={{ width: 13, height: 13 }} />
                      Bearbeiten
                    </button>
                    {g.filter && (
                      <button
                        onClick={() => reapplyFilter(g)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all text-left"
                        style={{ color: "var(--text-primary)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <Icon icon="solar:refresh-linear" style={{ width: 13, height: 13 }} />
                        Filter erneut anwenden
                      </button>
                    )}
                    <button
                      onClick={() => deleteGroup(g.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all text-left"
                      style={{ color: "#EF4444" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Icon icon="solar:trash-bin-trash-linear" style={{ width: 13, height: 13 }} />
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            ))}

            {groups.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>Noch keine Gruppen.</p>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="mt-2 text-[11px] underline"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Erste Gruppe erstellen
                </button>
              </div>
            )}
          </nav>
        )}
      </div>

      {/* ── Hauptinhalt ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader
          title={selectedGroup ? `${selectedGroup.emoji ? selectedGroup.emoji + " " : ""}${selectedGroup.name}` : "Kontakte"}
          subtitle={selectedGroup ? `${selectedGroup._count?.members ?? 0} Mitglieder` : "Alle Kunden & Interessenten"}
          actions={
            <>
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}>
                  <Icon icon="solar:users-group-rounded-linear" style={{ color: "var(--text-secondary)", width: 11, height: 11 }} />
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{contacts.length}</span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{selectedGroup ? "in Gruppe" : "Gesamt"}</span>
                </div>
                {!selectedGroup && (
                  <>
                    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}>
                      <Icon icon="solar:chat-round-line-linear" style={{ color: "#F2EAD3", width: 11, height: 11 }} />
                      <span className="text-sm font-bold" style={{ color: "#F2EAD3" }}>{withPhone}</span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}>
                      <Icon icon="solar:letter-linear" style={{ color: "#1B77BA", width: 11, height: 11 }} />
                      <span className="text-sm font-bold" style={{ color: "#1B77BA" }}>{withEmail}</span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>E-Mail</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center rounded-xl p-0.5" style={{ background: "var(--input-bg)" }}>
                <button onClick={() => setViewMode("grid")} className="p-2 rounded-lg transition-all" style={{ background: viewMode === "grid" ? "var(--border-strong)" : "transparent", color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  <Icon icon="solar:widget-2-linear" style={{ width: 15, height: 15 }} />
                </button>
                <button onClick={() => setViewMode("table")} className="p-2 rounded-lg transition-all" style={{ background: viewMode === "table" ? "var(--border-strong)" : "transparent", color: viewMode === "table" ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  <Icon icon="solar:list-linear" style={{ width: 15, height: 15 }} />
                </button>
              </div>
              {!selectedGroup && (
                <a href="/import" className="flex items-center gap-1.5 font-semibold text-sm" style={{ background: "#1B77BA", color: "#FFFFFF", borderRadius: "9999px", padding: "10px 20px", border: "1px solid rgba(27,119,186,0.5)", transition: "all 150ms ease" }}>
                  <Icon icon="solar:upload-linear" style={{ width: 16, height: 16 }} />
                  Importieren
                </a>
              )}
              {selectedGroup && (
                <button onClick={openAddMembers} className="flex items-center gap-1.5 font-semibold text-sm" style={{ background: "#F2EAD3", color: "#000000", borderRadius: "9999px", padding: "8px 20px", border: "none", transition: "all 150ms ease" }}>
                  <Icon icon="solar:user-plus-linear" style={{ width: 16, height: 16 }} />
                  Mitglied hinzufügen
                </button>
              )}
              {!selectedGroup && (
                <button onClick={() => setShowNewForm(true)} className="flex items-center gap-1.5 font-semibold text-sm" style={{ background: "#F2EAD3", color: "#000000", borderRadius: "9999px", padding: "8px 20px", border: "none", transition: "all 150ms ease" }}>
                  <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
                  Neuer Kontakt
                </button>
              )}
            </>
          }
        >
          {/* Mobile: Gruppen-Pills */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedGroupId(null)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: !selectedGroupId ? "#F2EAD3" : "var(--input-bg)", color: !selectedGroupId ? "#000" : "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Alle
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id === selectedGroupId ? null : g.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: selectedGroupId === g.id ? g.color : "var(--input-bg)", color: selectedGroupId === g.id ? (g.color === "#F2EAD3" ? "#000" : "#fff") : "var(--text-secondary)", border: `1px solid ${selectedGroupId === g.id ? g.color : "var(--border)"}` }}
              >
                {g.emoji && `${g.emoji} `}{g.name}
              </button>
            ))}
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              <Icon icon="solar:add-circle-linear" style={{ width: 12, height: 12 }} />
              Neue Gruppe
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3.5 py-2.5 max-w-sm" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
              <Icon icon="solar:magnifer-linear" style={{ color: "var(--text-secondary)", width: 16, height: 16, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Name, E-Mail oder Unternehmen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ color: "var(--text-secondary)" }}>
                  <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
            <button onClick={loadContacts} className="p-2.5 rounded-xl" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "transparent" }}>
              <Icon icon="solar:refresh-linear" style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </PageHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Lade Kontakte...</span>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            contacts.length === 0 ? (
              <EmptyState onAdd={() => setShowNewForm(true)} searched={!!searchDebounced} isGroup={!!selectedGroup} />
            ) : (
              <ContactTable contacts={contacts} onDelete={deleteContact} onContactClick={setDrawerContactId} extraColumns={extraColumns} viewMode="grid" />
            )
          ) : (
            <div style={{ ...gradientBorderCard, borderRadius: "12px" }}>
              <div style={{ borderRadius: "11px", background: "var(--surface)", overflow: "hidden" }}>
                <ContactTable contacts={contacts} onDelete={deleteContact} onContactClick={setDrawerContactId} extraColumns={extraColumns} viewMode="table" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close group menu on outside click */}
      {showGroupMenu && <div className="fixed inset-0 z-40" onClick={() => setShowGroupMenu(null)} />}

      {/* Add members modal */}
      {showAddMembers && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ ...gradientBorderCard, width: "100%", maxWidth: "480px", borderRadius: "16px" }}>
            <div style={{ borderRadius: "15px", background: "var(--surface)" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    Mitglieder hinzufügen
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {selectedGroup.emoji && `${selectedGroup.emoji} `}{selectedGroup.name}
                  </p>
                </div>
                <button onClick={() => setShowAddMembers(false)} className="p-2 rounded-xl" style={{ color: "var(--text-secondary)" }}>
                  <Icon icon="solar:close-circle-linear" style={{ width: 18, height: 18 }} />
                </button>
              </div>
              {/* Search */}
              <div className="px-5 pt-4">
                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                  <Icon icon="solar:magnifer-linear" style={{ color: "var(--text-secondary)", width: 15, height: 15 }} />
                  <input
                    type="text"
                    value={addSearch}
                    onChange={e => setAddSearch(e.target.value)}
                    placeholder="Kontakt suchen..."
                    autoFocus
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  {addSearch && (
                    <button onClick={() => setAddSearch("")} style={{ color: "var(--text-secondary)" }}>
                      <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>
              {/* Contact list */}
              <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: 360 }}>
                {loadingAllContacts ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
                  </div>
                ) : (() => {
                  const filtered = allContacts.filter(c => {
                    const q = addSearch.toLowerCase();
                    return !q || [c.firstName, c.lastName, c.email, c.company].some(v => v?.toLowerCase().includes(q));
                  });
                  if (filtered.length === 0) return (
                    <p className="text-center text-sm py-10" style={{ color: "var(--text-secondary)" }}>Keine Kontakte gefunden</p>
                  );
                  return filtered.map(c => {
                    const isMember = contacts.some(m => m.id === c.id);
                    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Kein Name";
                    const initials = [c.firstName?.charAt(0), c.lastName?.charAt(0)].filter(Boolean).join("").toUpperCase() || "?";
                    return (
                      <button
                        key={c.id}
                        onClick={() => !isMember && addMemberToGroup(c)}
                        disabled={isMember || addingId === c.id}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all text-left"
                        style={{ opacity: isMember ? 0.5 : 1, cursor: isMember ? "default" : "pointer" }}
                        onMouseEnter={e => { if (!isMember) (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{name}</p>
                          {c.company && <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{c.company}</p>}
                        </div>
                        {addingId === c.id ? (
                          <div className="w-4 h-4 rounded-full animate-spin flex-shrink-0" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
                        ) : isMember ? (
                          <Icon icon="solar:check-circle-bold" style={{ color: "#22c55e", width: 16, height: 16, flexShrink: 0 }} />
                        ) : (
                          <Icon icon="solar:user-plus-linear" style={{ color: "var(--text-secondary)", width: 15, height: 15, flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
              <div className="px-5 pb-5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => setShowAddMembers(false)}
                  className="w-full flex items-center justify-center font-semibold text-sm"
                  style={{ background: "var(--input-bg)", color: "var(--text-primary)", borderRadius: "9999px", padding: "10px", border: "1px solid var(--border)" }}
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group modal */}
      {showGroupModal && (
        <GroupModal
          group={editingGroup}
          onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
          onSaved={(saved) => { loadGroups(); setShowGroupModal(false); setEditingGroup(null); setSelectedGroupId(saved.id); }}
        />
      )}

      {/* WhatsApp template modal */}
      {templateModal && (
        <TemplateModal
          contactId={templateModal.id}
          contactName={templateModal.name}
          contactPhone={templateModal.phone}
          onClose={() => { setTemplateModal(null); setDrawerContactId(templateModal!.id); }}
          onSent={() => { setTemplateModal(null); setDrawerContactId(templateModal!.id); }}
        />
      )}

      {/* New contact modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ ...gradientBorderCard, width: "100%", maxWidth: "448px", borderRadius: "16px" }}>
            <div style={{ borderRadius: "15px", background: "var(--surface)" }}>
              <div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(242,234,211,0.1)" }}>
                    <Icon icon="solar:user-linear" style={{ color: "#F2EAD3", width: 18, height: 18 }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontWeight: 400 }}>Neuer Kontakt</h2>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Felder ausfüllen und speichern</p>
                  </div>
                </div>
                <button onClick={() => setShowNewForm(false)} className="p-2 rounded-xl" style={{ color: "var(--text-secondary)" }}>
                  <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Vorname</label>
                    <input type="text" value={newContact.firstName} onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })} placeholder="Max" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nachname</label>
                    <input type="text" value={newContact.lastName} onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })} placeholder="Mustermann" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>E-Mail</label>
                  <input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="max@beispiel.de" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Telefon / WhatsApp</label>
                  <input type="tel" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+49 170 1234567" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Unternehmen</label>
                  <input type="text" value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} placeholder="Muster GmbH" style={inputStyle} />
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={() => setShowNewForm(false)} className="flex-1 flex items-center justify-center font-semibold text-sm" style={{ background: "#1B77BA", color: "#FFFFFF", borderRadius: "9999px", padding: "10px 32px", border: "1px solid rgba(27,119,186,0.5)" }}>
                  Abbrechen
                </button>
                <button
                  onClick={createContact}
                  disabled={saving || (!newContact.firstName && !newContact.lastName && !newContact.email)}
                  className="flex-1 flex items-center justify-center gap-2 font-semibold text-sm"
                  style={{ background: "#F2EAD3", color: "#000000", borderRadius: "9999px", padding: "8px 20px", border: "none", opacity: (saving || (!newContact.firstName && !newContact.lastName && !newContact.email)) ? 0.5 : 1 }}
                >
                  {saving ? <><div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000" }} />Speichert...</> : "Erstellen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact drawer */}
      {drawerContactId && (
        <ContactDrawer contactId={drawerContactId} onClose={() => setDrawerContactId(null)} />
      )}
    </div>
  );
}

function EmptyState({ onAdd, searched, isGroup }: { onAdd: () => void; searched: boolean; isGroup: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: "var(--input-bg)" }}>
        <Icon icon={searched ? "solar:magnifer-linear" : isGroup ? "solar:users-group-two-rounded-linear" : "solar:users-group-rounded-linear"} style={{ color: "var(--text-dim)", width: 36, height: 36 }} />
      </div>
      <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
        {searched ? "Keine Ergebnisse" : isGroup ? "Gruppe ist leer" : "Noch keine Kontakte"}
      </h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: "var(--text-secondary)" }}>
        {searched ? "Versuche es mit einem anderen Suchbegriff." : isGroup ? "Bearbeite den Filter oder füge Kontakte manuell hinzu." : "Legen Sie Ihren ersten Kontakt an oder importieren Sie eine Excel-Datei."}
      </p>
      {!searched && !isGroup && (
        <button onClick={onAdd} className="flex items-center gap-2 font-semibold text-sm" style={{ background: "#F2EAD3", color: "#000000", borderRadius: "9999px", padding: "8px 20px", border: "none" }}>
          <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
          Ersten Kontakt anlegen
        </button>
      )}
    </div>
  );
}
