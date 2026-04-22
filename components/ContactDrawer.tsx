"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import MessageTimeline from "@/components/MessageTimeline";
import VorgaengeTab from "@/components/VorgaengeTab";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { formatDue } from "@/lib/utils";

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
  id: string; createdAt: string; channel: string; direction: string;
  content: string; subject: string | null; status: string | null; sentAt: string | null;
  mediaUrl: string | null; mediaName: string | null;
}
interface Task {
  id: string; title: string; dueDate: string; type: string;
  notes: string | null; completed: boolean;
}

const TASK_TYPES: Record<string, { label: string; iconName: string; color: string; bg: string }> = {
  call:    { label: "Anruf",   iconName: "solar:phone-linear",              color: "rgba(52,211,153,1)",  bg: "rgba(52,211,153,0.1)"  },
  email:   { label: "E-Mail",  iconName: "solar:letter-linear",             color: "rgba(96,165,250,1)",  bg: "rgba(59,130,246,0.1)"  },
  meeting: { label: "Meeting", iconName: "solar:users-group-rounded-linear",color: "rgba(167,139,250,1)", bg: "rgba(139,92,246,0.1)"  },
  todo:    { label: "Aufgabe", iconName: "solar:check-square-linear",       color: "rgba(251,191,36,1)",  bg: "rgba(251,191,36,0.1)"  },
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: 13,
  color: "#FFFFFF",
  outline: "none",
  transition: "border-color 150ms ease",
};

interface Props {
  contactId: string;
  onClose: () => void;
  initialTab?: "messages" | "tasks" | "vorgaenge";
  openVorgangId?: string;
}

export default function ContactDrawer({ contactId, onClose, initialTab = "messages", openVorgangId }: Props) {
  const [visible, setVisible]     = useState(false);
  const [contact, setContact]     = useState<Contact | null>(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [editData, setEditData]   = useState<Partial<Contact>>({});
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "tasks" | "vorgaenge">(initialTab);
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask]     = useState({ title: "", type: "call", dueDate: format(new Date(), "yyyy-MM-dd"), dueTime: "", notes: "" });
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contacts/${contactId}`);
        if (!res.ok) { close(); return; }
        const data = await res.json();
        setContact(data.contact);
        setEditData(data.contact);
      } catch { close(); }
      finally { setLoading(false); }
    }
    load();
  }, [contactId]);

  useEffect(() => {
    fetch(`/api/tasks?contactId=${contactId}`)
      .then(r => r.json())
      .then(d => setTasks(d.tasks || []));
  }, [contactId]);

  async function createTask() {
    if (!newTask.title || !newTask.dueDate) return;
    setSavingTask(true);
    try {
      const dueDateISO = newTask.dueTime
        ? new Date(`${newTask.dueDate}T${newTask.dueTime}`).toISOString()
        : new Date(newTask.dueDate).toISOString();
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, contactId, dueDate: dueDateISO }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(prev => [...prev, data.task]);
        setNewTask({ title: "", type: "call", dueDate: format(new Date(), "yyyy-MM-dd"), dueTime: "", notes: "" });
        setShowTaskForm(false);
      }
    } finally { setSavingTask(false); }
  }

  async function completeTask(id: string, completed: boolean) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function saveContact() {
    if (!contact) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editData.firstName, lastName: editData.lastName,
          email: editData.email, phone: editData.phone,
          company: editData.company, notes: editData.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) { setContact({ ...contact, ...data.contact }); setEditing(false); }
    } finally { setSaving(false); }
  }

  function getInitials(c: Contact) {
    return [c.firstName?.charAt(0), c.lastName?.charAt(0)].filter(Boolean).join("").toUpperCase() || "?";
  }
  function getCustomFields(c: Contact): Record<string, string> {
    if (!c.customFields) return {};
    try { return JSON.parse(c.customFields); } catch { return {}; }
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 3,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0, background: "rgba(0,0,0,0.5)" }}
        onClick={close}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 bottom-0 right-0 z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{
          left: "14rem",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          background: "#161616",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full animate-spin"
              style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }}
            />
          </div>
        ) : !contact ? null : (() => {
          const customFields = getCustomFields(contact);
          return (
            <>
              {/* Top bar */}
              <div
                className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
                style={{ background: "#1C1C1C", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  onClick={close}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)", background: "transparent", transition: "all 150ms ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
                >
                  <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "rgba(242,234,211,0.1)", color: "#F2EAD3" }}
                  >
                    {getInitials(contact)}
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-semibold leading-tight truncate" style={{ color: "#FFFFFF" }}>
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Kein Name"}
                    </h1>
                    <p className="text-xs leading-tight truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {contact.company || "Kein Unternehmen"} · {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true, locale: de })} erstellt
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", background: "transparent", transition: "all 150ms ease" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
                    >
                      <Icon icon="solar:pen-linear" style={{ width: 14, height: 14 }} /> Bearbeiten
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditData(contact); setEditing(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} /> Abbrechen
                      </button>
                      <button
                        onClick={saveContact}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                        style={{ background: "#F2EAD3", color: "#000000", opacity: saving ? 0.7 : 1 }}
                      >
                        {saving
                          ? <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
                          : <Icon icon="solar:diskette-linear" style={{ width: 14, height: 14 }} />}
                        Speichern
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left: info panel */}
                <div
                  className="w-72 xl:w-80 flex-shrink-0 overflow-y-auto"
                  style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "#161616" }}
                >
                  <div className="p-5 space-y-6">
                    {/* Contact fields */}
                    <div>
                      <div style={sectionLabel}>
                        <Icon icon="solar:user-linear" style={{ width: 14, height: 14 }} />
                        Kontaktdaten
                      </div>
                      <div className="space-y-3">
                        {/* Vorname */}
                        <div>
                          <label style={fieldLabel}>Vorname</label>
                          {editing
                            ? <input
                                type="text"
                                value={editData.firstName || ""}
                                onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                                style={inputStyle}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                              />
                            : <p className="text-sm font-medium" style={{ color: contact.firstName ? "#FFFFFF" : "rgba(255,255,255,0.2)", fontStyle: contact.firstName ? "normal" : "italic" }}>
                                {contact.firstName || "Kein Vorname"}
                              </p>}
                        </div>
                        {/* Nachname */}
                        <div>
                          <label style={fieldLabel}>Nachname</label>
                          {editing
                            ? <input
                                type="text"
                                value={editData.lastName || ""}
                                onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                                style={inputStyle}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                              />
                            : <p className="text-sm font-medium" style={{ color: contact.lastName ? "#FFFFFF" : "rgba(255,255,255,0.2)", fontStyle: contact.lastName ? "normal" : "italic" }}>
                                {contact.lastName || "Kein Nachname"}
                              </p>}
                        </div>
                        {/* E-Mail */}
                        <div>
                          <label style={{ ...fieldLabel, display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon icon="solar:letter-linear" style={{ width: 10, height: 10 }} /> E-Mail
                          </label>
                          {editing
                            ? <input
                                type="email"
                                value={editData.email || ""}
                                onChange={e => setEditData({ ...editData, email: e.target.value })}
                                style={inputStyle}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                              />
                            : contact.email
                              ? <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="text-sm truncate block" style={{ color: "#F2EAD3" }}>{contact.email}</a>
                              : <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>Keine E-Mail</p>}
                        </div>
                        {/* Telefon */}
                        <div>
                          <label style={{ ...fieldLabel, display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon icon="solar:phone-linear" style={{ width: 10, height: 10 }} /> Telefon / WhatsApp
                          </label>
                          {editing
                            ? <input
                                type="tel"
                                value={editData.phone || ""}
                                placeholder="+49 170 1234567"
                                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                style={inputStyle}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                              />
                            : contact.phone
                              ? <a href={`tel:${contact.phone}`} className="text-sm" style={{ color: "#F2EAD3" }}>{contact.phone}</a>
                              : <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>Kein Telefon</p>}
                        </div>
                        {/* Unternehmen */}
                        <div>
                          <label style={{ ...fieldLabel, display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon icon="solar:buildings-linear" style={{ width: 10, height: 10 }} /> Unternehmen
                          </label>
                          {editing
                            ? <input
                                type="text"
                                value={editData.company || ""}
                                onChange={e => setEditData({ ...editData, company: e.target.value })}
                                style={inputStyle}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                              />
                            : <p className="text-sm font-medium" style={{ color: contact.company ? "#FFFFFF" : "rgba(255,255,255,0.2)", fontStyle: contact.company ? "normal" : "italic" }}>
                                {contact.company || "Kein Unternehmen"}
                              </p>}
                        </div>
                      </div>
                    </div>

                    {/* Notizen */}
                    <div>
                      <div style={sectionLabel}>
                        <Icon icon="solar:document-text-linear" style={{ width: 14, height: 14 }} />
                        Notizen
                      </div>
                      {editing
                        ? <textarea
                            value={editData.notes || ""}
                            onChange={e => setEditData({ ...editData, notes: e.target.value })}
                            rows={4}
                            placeholder="Notizen zum Kontakt..."
                            style={{ ...inputStyle, resize: "none" }}
                            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                          />
                        : <p className="text-sm whitespace-pre-wrap" style={{ color: contact.notes ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", fontStyle: contact.notes ? "normal" : "italic" }}>
                            {contact.notes || "Keine Notizen"}
                          </p>}
                    </div>

                    {/* Custom fields */}
                    {Object.keys(customFields).length > 0 && (
                      <div>
                        <div style={sectionLabel}>
                          <Icon icon="solar:hashtag-linear" style={{ width: 14, height: 14 }} />
                          Benutzerdefinierte Felder
                        </div>
                        <div className="space-y-2">
                          {Object.entries(customFields).map(([key, value]) => (
                            <div key={key}>
                              <label style={fieldLabel}>{key}</label>
                              <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <Icon icon="solar:calendar-linear" style={{ width: 14, height: 14 }} />
                        Erstellt {new Date(contact.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: tabs */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                  {/* Tab bar */}
                  <div
                    className="flex items-center px-4 gap-1 pt-2 flex-shrink-0"
                    style={{ background: "#1C1C1C", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {([
                      { key: "messages",  label: "Nachrichten", iconName: "solar:letter-linear",                 badge: contact.messages.length },
                      { key: "tasks",     label: "Aufgaben",    iconName: "solar:clipboard-list-linear",
                        badge: tasks.filter(t => !t.completed).length || undefined,
                        badgeRed: tasks.filter(t => !t.completed && isPast(new Date(t.dueDate))).length > 0 },
                      { key: "vorgaenge", label: "Vorgänge",    iconName: "solar:folder-open-linear" },
                    ] as const).map(tab => {
                      const isActive = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key as typeof activeTab)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all"
                          style={{
                            borderBottom: isActive ? "2px solid #F2EAD3" : "2px solid transparent",
                            color: isActive ? "#F2EAD3" : "rgba(255,255,255,0.4)",
                            background: "transparent",
                            transition: "all 150ms ease",
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
                        >
                          <Icon icon={tab.iconName} style={{ width: 14, height: 14 }} />
                          {tab.label}
                          {"badge" in tab && tab.badge !== undefined && tab.badge > 0 && (
                            <span
                              className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: "badgeRed" in tab && tab.badgeRed ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)",
                                color: "badgeRed" in tab && tab.badgeRed ? "#EF4444" : "rgba(255,255,255,0.5)",
                              }}
                            >{tab.badge}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-hidden">
                    {activeTab === "messages" ? (
                      <MessageTimeline contact={contact} initialMessages={contact.messages} />
                    ) : activeTab === "vorgaenge" ? (
                      <div className="h-full overflow-y-auto p-4">
                        <VorgaengeTab contact={contact} openVorgangId={openVorgangId} />
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto p-4 space-y-3">
                        {/* Add task button */}
                        <button
                          onClick={() => setShowTaskForm(v => !v)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
                          style={{
                            border: "2px dashed rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.35)",
                            background: "transparent",
                            transition: "all 150ms ease",
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(242,234,211,0.4)";
                            (e.currentTarget as HTMLElement).style.color = "#F2EAD3";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)";
                          }}
                        >
                          <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
                          Wiedervorlage hinzufügen
                        </button>

                        {showTaskForm && (
                          <div
                            className="rounded-xl p-4 space-y-3"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            {/* Type selector */}
                            <div className="grid grid-cols-4 gap-1.5">
                              {Object.entries(TASK_TYPES).map(([key, cfg]) => (
                                <button
                                  key={key}
                                  onClick={() => setNewTask(f => ({ ...f, type: key }))}
                                  className="flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all"
                                  style={{
                                    border: newTask.type === key ? `2px solid ${cfg.color}` : "2px solid rgba(255,255,255,0.08)",
                                    background: newTask.type === key ? cfg.bg : "rgba(255,255,255,0.03)",
                                    color: newTask.type === key ? cfg.color : "rgba(255,255,255,0.35)",
                                    transition: "all 150ms ease",
                                  }}
                                >
                                  <Icon icon={cfg.iconName} style={{ width: 14, height: 14 }} />
                                  {cfg.label}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={newTask.title}
                              onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))}
                              placeholder="Aufgabe beschreiben..."
                              autoFocus
                              style={inputStyle}
                              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                value={newTask.dueDate}
                                onChange={e => setNewTask(f => ({ ...f, dueDate: e.target.value }))}
                                style={inputStyle}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                              />
                              <input
                                type="time"
                                value={newTask.dueTime}
                                onChange={e => setNewTask(f => ({ ...f, dueTime: e.target.value }))}
                                style={inputStyle}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowTaskForm(false)}
                                className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", background: "transparent" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                Abbrechen
                              </button>
                              <button
                                onClick={createTask}
                                disabled={savingTask || !newTask.title}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                                style={{ background: "#F2EAD3", color: "#000000", opacity: savingTask || !newTask.title ? 0.5 : 1 }}
                              >
                                {savingTask ? "..." : "Erstellen"}
                              </button>
                            </div>
                          </div>
                        )}

                        {tasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            >
                              <Icon icon="solar:clipboard-list-linear" style={{ color: "rgba(255,255,255,0.15)", width: 24, height: 24 }} />
                            </div>
                            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Keine Aufgaben</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {tasks
                              .sort((a, b) => Number(a.completed) - Number(b.completed) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                              .map(task => {
                                const cfg = TASK_TYPES[task.type] || TASK_TYPES.todo;
                                const due = new Date(task.dueDate);
                                const overdue = isPast(due) && !isToday(due) && !task.completed;
                                return (
                                  <div
                                    key={task.id}
                                    className="flex items-start gap-2.5 p-3 rounded-xl transition-all group"
                                    style={{
                                      background: task.completed ? "rgba(255,255,255,0.02)" : overdue ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.04)",
                                      border: overdue ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.06)",
                                      borderLeft: overdue ? "3px solid #EF4444" : undefined,
                                      opacity: task.completed ? 0.5 : 1,
                                      transition: "all 150ms ease",
                                    }}
                                  >
                                    <button
                                      onClick={() => completeTask(task.id, !task.completed)}
                                      className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                                      style={{
                                        border: task.completed ? "none" : "2px solid rgba(255,255,255,0.2)",
                                        background: task.completed ? "rgba(52,211,153,1)" : "transparent",
                                        transition: "all 150ms ease",
                                      }}
                                      onMouseEnter={e => { if (!task.completed) (e.currentTarget as HTMLElement).style.borderColor = "#F2EAD3"; }}
                                      onMouseLeave={e => { if (!task.completed) (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                                    >
                                      {task.completed && <Icon icon="solar:check-read-linear" style={{ color: "#FFFFFF", width: 10, height: 10 }} />}
                                    </button>
                                    <div
                                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{ background: cfg.bg }}
                                    >
                                      <Icon icon={cfg.iconName} style={{ color: cfg.color, width: 12, height: 12 }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-xs font-semibold"
                                        style={{
                                          color: task.completed ? "rgba(255,255,255,0.3)" : "#FFFFFF",
                                          textDecoration: task.completed ? "line-through" : "none",
                                        }}
                                      >
                                        {task.title}
                                      </p>
                                      <p
                                        className="text-[10px] mt-0.5 flex items-center gap-1"
                                        style={{ color: overdue ? "#EF4444" : "rgba(255,255,255,0.35)", fontWeight: overdue ? 600 : 400 }}
                                      >
                                        <Icon
                                          icon={overdue ? "solar:danger-triangle-linear" : "solar:clock-circle-linear"}
                                          style={{ width: 12, height: 12 }}
                                        />
                                        {formatDue(due)}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => deleteTask(task.id)}
                                      className="p-1 rounded transition-all opacity-0 group-hover:opacity-100"
                                      style={{ color: "rgba(255,255,255,0.25)", background: "transparent", transition: "all 150ms ease" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)"; }}
                                    >
                                      <Icon icon="solar:trash-bin-trash-linear" style={{ width: 14, height: 14 }} />
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
