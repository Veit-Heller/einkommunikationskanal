"use client";

import { useState, useEffect } from "react";
import MessageTimeline from "@/components/MessageTimeline";
import VorgaengeTab from "@/components/VorgaengeTab";
import {
  Mail, Phone, Building2, FileText, Edit3, Save, X, Loader2,
  User, Calendar, Hash, ClipboardList, Plus, Check, Trash2,
  Phone as PhoneIcon, Users, CheckSquare, Clock, AlertCircle, FolderOpen,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from "date-fns";
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
}
interface Task {
  id: string; title: string; dueDate: string; type: string;
  notes: string | null; completed: boolean;
}

const TASK_TYPES: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  call:    { label: "Anruf",   icon: PhoneIcon,   color: "text-emerald-600", bg: "bg-emerald-50" },
  email:   { label: "E-Mail",  icon: Mail,        color: "text-blue-600",    bg: "bg-blue-50"    },
  meeting: { label: "Meeting", icon: Users,       color: "text-violet-600",  bg: "bg-violet-50"  },
  todo:    { label: "Aufgabe", icon: CheckSquare, color: "text-amber-600",   bg: "bg-amber-50"   },
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

  // Slide-in animation
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  // Close with slide-out
  function close() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  // ESC key
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/25 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={close}
      />

      {/* Drawer panel — sits right of the sidebar */}
      <div
        className="fixed top-0 bottom-0 right-0 z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{ left: "14rem", transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : !contact ? null : (() => {
          const customFields = getCustomFields(contact);
          return (
            <>
              {/* Top bar */}
              <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-100 flex-shrink-0">
                <button onClick={close} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-lime-100 flex items-center justify-center text-sm font-bold text-lime-700 flex-shrink-0">
                    {getInitials(contact)}
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-semibold text-slate-900 leading-tight truncate">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Kein Name"}
                    </h1>
                    <p className="text-xs text-slate-400 leading-tight truncate">
                      {contact.company || "Kein Unternehmen"} · {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true, locale: de })} erstellt
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!editing ? (
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" /> Bearbeiten
                    </button>
                  ) : (
                    <>
                      <button onClick={() => { setEditData(contact); setEditing(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                        <X className="w-3.5 h-3.5" /> Abbrechen
                      </button>
                      <button onClick={saveContact} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-500 rounded-lg text-sm font-medium text-white hover:bg-lime-600 disabled:opacity-50">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Speichern
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left: info */}
                <div className="w-72 xl:w-80 flex-shrink-0 overflow-y-auto border-r border-slate-100 bg-white">
                  <div className="p-5 space-y-6">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Kontaktdaten
                      </h3>
                      <div className="space-y-3">
                        {/* Vorname */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-0.5">Vorname</label>
                          {editing
                            ? <input type="text" value={editData.firstName || ""} onChange={e => setEditData({ ...editData, firstName: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                            : <p className="text-sm font-medium text-slate-800">{contact.firstName || <span className="text-slate-300 italic font-normal">Kein Vorname</span>}</p>}
                        </div>
                        {/* Nachname */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-0.5">Nachname</label>
                          {editing
                            ? <input type="text" value={editData.lastName || ""} onChange={e => setEditData({ ...editData, lastName: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                            : <p className="text-sm font-medium text-slate-800">{contact.lastName || <span className="text-slate-300 italic font-normal">Kein Nachname</span>}</p>}
                        </div>
                        {/* E-Mail */}
                        <div>
                          <label className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3" /> E-Mail</label>
                          {editing
                            ? <input type="email" value={editData.email || ""} onChange={e => setEditData({ ...editData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                            : contact.email
                              ? <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="text-sm text-lime-600 hover:underline truncate block">{contact.email}</a>
                              : <p className="text-sm text-slate-300 italic">Keine E-Mail</p>}
                        </div>
                        {/* Telefon */}
                        <div>
                          <label className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon / WhatsApp</label>
                          {editing
                            ? <input type="tel" value={editData.phone || ""} placeholder="+49 170 1234567" onChange={e => setEditData({ ...editData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                            : contact.phone
                              ? <a href={`tel:${contact.phone}`} className="text-sm text-lime-600 hover:underline">{contact.phone}</a>
                              : <p className="text-sm text-slate-300 italic">Kein Telefon</p>}
                        </div>
                        {/* Unternehmen */}
                        <div>
                          <label className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> Unternehmen</label>
                          {editing
                            ? <input type="text" value={editData.company || ""} onChange={e => setEditData({ ...editData, company: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                            : <p className="text-sm font-medium text-slate-800">{contact.company || <span className="text-slate-300 italic font-normal">Kein Unternehmen</span>}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Notizen */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Notizen
                      </h3>
                      {editing
                        ? <textarea value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={4} placeholder="Notizen zum Kontakt..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                        : <p className="text-sm text-slate-700 whitespace-pre-wrap">{contact.notes || <span className="text-slate-300 italic">Keine Notizen</span>}</p>}
                    </div>

                    {/* Custom fields */}
                    {Object.keys(customFields).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5" /> Benutzerdefinierte Felder
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(customFields).map(([key, value]) => (
                            <div key={key}>
                              <label className="block text-xs text-slate-400 mb-0.5">{key}</label>
                              <p className="text-sm text-slate-700">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        Erstellt {new Date(contact.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: tabs */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                  {/* Tab bar */}
                  <div className="flex items-center border-b border-slate-100 bg-white px-4 gap-1 pt-2 flex-shrink-0">
                    {([
                      { key: "messages", label: "Nachrichten", icon: Mail, badge: contact.messages.length },
                      { key: "tasks",    label: "Aufgaben",    icon: ClipboardList,
                        badge: tasks.filter(t => !t.completed).length || undefined,
                        badgeRed: tasks.filter(t => !t.completed && isPast(new Date(t.dueDate))).length > 0 },
                      { key: "vorgaenge", label: "Vorgänge",  icon: FolderOpen },
                    ] as const).map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                            activeTab === tab.key ? "border-lime-600 text-lime-600" : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}>
                          <Icon className="w-3.5 h-3.5" />
                          {tab.label}
                          {"badge" in tab && tab.badge !== undefined && tab.badge > 0 && (
                            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              "badgeRed" in tab && tab.badgeRed ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
                            }`}>{tab.badge}</span>
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
                        <button onClick={() => setShowTaskForm(v => !v)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-lime-400 hover:text-lime-600 transition-all">
                          <Plus className="w-4 h-4" /> Wiedervorlage hinzufügen
                        </button>

                        {showTaskForm && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="grid grid-cols-4 gap-1.5">
                              {Object.entries(TASK_TYPES).map(([key, cfg]) => {
                                const Icon = cfg.icon;
                                return (
                                  <button key={key} onClick={() => setNewTask(f => ({ ...f, type: key }))}
                                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${
                                      newTask.type === key ? `border-lime-500 ${cfg.bg} ${cfg.color}` : "border-slate-200 bg-white text-slate-400"
                                    }`}>
                                    <Icon className="w-3.5 h-3.5" />{cfg.label}
                                  </button>
                                );
                              })}
                            </div>
                            <input type="text" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))}
                              placeholder="Aufgabe beschreiben..." autoFocus
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="date" value={newTask.dueDate} onChange={e => setNewTask(f => ({ ...f, dueDate: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400" />
                              <input type="time" value={newTask.dueTime} onChange={e => setNewTask(f => ({ ...f, dueTime: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 text-slate-500" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setShowTaskForm(false)}
                                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:bg-white transition-colors">
                                Abbrechen
                              </button>
                              <button onClick={createTask} disabled={savingTask || !newTask.title}
                                className="flex-1 py-2 bg-lime-500 rounded-lg text-xs font-semibold text-white hover:bg-lime-600 disabled:opacity-40 transition-colors">
                                {savingTask ? "..." : "Erstellen"}
                              </button>
                            </div>
                          </div>
                        )}

                        {tasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                              <ClipboardList className="w-6 h-6 text-slate-200" />
                            </div>
                            <p className="text-sm text-slate-400">Keine Aufgaben</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {tasks.sort((a, b) => Number(a.completed) - Number(b.completed) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                              .map(task => {
                                const cfg = TASK_TYPES[task.type] || TASK_TYPES.todo;
                                const Icon = cfg.icon;
                                const due = new Date(task.dueDate);
                                const overdue = isPast(due) && !isToday(due) && !task.completed;
                                return (
                                  <div key={task.id} className={`group flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                                    task.completed ? "border-slate-100 bg-slate-50 opacity-50"
                                    : overdue ? "border-red-100 bg-red-50/40 border-l-4 border-l-red-400"
                                    : "border-slate-100 bg-white hover:shadow-sm"
                                  }`}>
                                    <button onClick={() => completeTask(task.id, !task.completed)}
                                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                        task.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-lime-500"
                                      }`}>
                                      {task.completed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                    </button>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                                      <Icon className={`w-3 h-3 ${cfg.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-semibold text-slate-800 ${task.completed ? "line-through text-slate-400" : ""}`}>{task.title}</p>
                                      <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${overdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                                        {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        {formatDue(due)}
                                      </p>
                                    </div>
                                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 transition-all">
                                      <Trash2 className="w-3.5 h-3.5" />
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
