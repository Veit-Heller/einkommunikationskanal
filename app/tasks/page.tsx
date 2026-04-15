"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, Mail, Users, CheckSquare, Plus, Trash2,
  ClipboardList, ChevronDown, ChevronUp, Check,
  Calendar, AlertCircle, Clock, Inbox,
} from "lucide-react";
import {
  format, isToday, isTomorrow, isPast, isThisWeek,
  formatDistanceToNow,
} from "date-fns";
import { de } from "date-fns/locale";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  notes: string | null;
  completed: boolean;
  completedAt: string | null;
  contact: Contact;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  call:    { label: "Anruf",   icon: Phone,       color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-400" },
  email:   { label: "E-Mail",  icon: Mail,        color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-400" },
  meeting: { label: "Meeting", icon: Users,       color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-400" },
  todo:    { label: "Aufgabe", icon: CheckSquare, color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-400" },
};

function getContactName(c: Contact) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "Unbekannt";
}

function formatDue(date: Date) {
  if (isPast(date) && !isToday(date)) return `Seit ${formatDistanceToNow(date, { locale: de })}`;
  if (isToday(date)) return "Heute";
  if (isTomorrow(date)) return "Morgen";
  return format(date, "EEE, d. MMM", { locale: de });
}

function groupTasks(tasks: Task[]) {
  const overdue: Task[] = [], today: Task[] = [], week: Task[] = [], later: Task[] = [], done: Task[] = [];
  for (const t of tasks) {
    if (t.completed) { done.push(t); continue; }
    const d = new Date(t.dueDate);
    if (isPast(d) && !isToday(d)) overdue.push(t);
    else if (isToday(d)) today.push(t);
    else if (isThisWeek(d, { locale: de })) week.push(t);
    else later.push(t);
  }
  return { overdue, today, week, later, done };
}

const FILTER_TABS = [
  { key: "all", label: "Alle" },
  { key: "call", label: "Anrufe" },
  { key: "email", label: "E-Mails" },
  { key: "meeting", label: "Meetings" },
  { key: "todo", label: "Aufgaben" },
];

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/contacts").then(r => r.json()).then(d => setContacts(d.contacts || []));
  }, []);

  async function completeTask(id: string, completed: boolean) {
    setCompleting(id);
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t));
    setTimeout(() => setCompleting(null), 300);
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.type === filter);
  const { overdue, today, week, later, done } = groupTasks(filtered);
  const totalPending = overdue.length + today.length + week.length + later.length;

  const sections = [
    { key: "overdue", label: "Überfällig", tasks: overdue, accent: "text-red-600", barColor: "bg-red-500", urgency: "overdue" },
    { key: "today",   label: "Heute",      tasks: today,   accent: "text-orange-600", barColor: "bg-orange-400", urgency: "today" },
    { key: "week",    label: "Diese Woche",tasks: week,    accent: "text-yellow-600", barColor: "bg-yellow-400", urgency: "week" },
    { key: "later",   label: "Später",     tasks: later,   accent: "text-blue-600",  barColor: "bg-blue-400",   urgency: "later" },
  ];

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Aufgaben & Wiedervorlagen
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {totalPending} offen{overdue.length > 0 && <span className="text-red-500 ml-1.5">· {overdue.length} überfällig</span>}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Neue Aufgabe
          </button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-4xl mx-auto mt-4 flex gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-300">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalPending === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-blue-300" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Alles erledigt!</h3>
            <p className="text-sm text-gray-400 mb-4">Keine offenen Aufgaben. Füge eine neue hinzu.</p>
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              Neue Aufgabe
            </button>
          </div>
        ) : (
          sections.map(section => section.tasks.length > 0 && (
            <TaskSection
              key={section.key}
              label={section.label}
              tasks={section.tasks}
              accent={section.accent}
              barColor={section.barColor}
              urgency={section.urgency}
              completing={completing}
              onComplete={completeTask}
              onDelete={deleteTask}
              onContactClick={(id) => router.push(`/contacts/${id}`)}
            />
          ))
        )}

        {/* Done section */}
        {done.length > 0 && (
          <div>
            <button
              onClick={() => setShowDone(v => !v)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"
            >
              {showDone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {done.length} erledigte Aufgaben
            </button>
            {showDone && (
              <div className="space-y-2 opacity-60">
                {done.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    urgency="done"
                    completing={completing}
                    onComplete={completeTask}
                    onDelete={deleteTask}
                    onContactClick={(id) => router.push(`/contacts/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <TaskCreateModal
          contacts={contacts}
          onClose={() => setShowModal(false)}
          onCreated={(task) => { setTasks(prev => [task, ...prev]); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function TaskSection({ label, tasks, accent, barColor, urgency, completing, onComplete, onDelete, onContactClick }: {
  label: string; tasks: Task[]; accent: string; barColor: string; urgency: string;
  completing: string | null;
  onComplete: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onContactClick: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-2 h-2 rounded-full ${barColor}`} />
        <h2 className={`text-xs font-bold uppercase tracking-wider ${accent}`}>{label}</h2>
        <span className={`text-xs font-semibold ${accent} opacity-70`}>{tasks.length}</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            urgency={urgency}
            completing={completing}
            onComplete={onComplete}
            onDelete={onDelete}
            onContactClick={onContactClick}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, urgency, completing, onComplete, onDelete, onContactClick }: {
  task: Task; urgency: string; completing: string | null;
  onComplete: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onContactClick: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.todo;
  const Icon = cfg.icon;
  const isCompleting = completing === task.id;
  const due = new Date(task.dueDate);

  const urgencyBar: Record<string, string> = {
    overdue: "border-l-red-400 bg-red-50/40",
    today:   "border-l-orange-400 bg-orange-50/20",
    week:    "border-l-yellow-400 bg-yellow-50/10",
    later:   "border-l-blue-300 bg-white",
    done:    "border-l-gray-200 bg-white",
  };

  return (
    <div className={`group flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 border-l-4 ${urgencyBar[urgency]} hover:shadow-sm transition-all duration-150 ${isCompleting ? "scale-[0.99] opacity-70" : ""} ${task.completed ? "opacity-50" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={() => onComplete(task.id, !task.completed)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          task.completed
            ? "bg-emerald-500 border-emerald-500"
            : "border-gray-300 hover:border-blue-500"
        }`}
      >
        {task.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      {/* Type icon */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold text-gray-800 leading-tight ${task.completed ? "line-through text-gray-400" : ""}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <button
            onClick={() => onContactClick(task.contact.id)}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
          >
            {getContactName(task.contact)}
          </button>
          <span className="text-gray-200">·</span>
          <span className={`flex items-center gap-1 text-xs ${urgency === "overdue" ? "text-red-500 font-semibold" : "text-gray-400"}`}>
            {urgency === "overdue" ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {formatDue(due)}
          </span>
          {task.notes && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400 truncate max-w-[160px]">{task.notes}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCreateModal({ contacts, onClose, onCreated }: {
  contacts: Contact[];
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [form, setForm] = useState({
    contactId: "",
    title: "",
    type: "call",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    contactSearch: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredContacts = contacts.filter(c => {
    const name = getContactName(c).toLowerCase();
    return name.includes(form.contactSearch.toLowerCase());
  }).slice(0, 8);

  async function create() {
    if (!form.contactId || !form.title || !form.dueDate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: form.contactId,
          title: form.title,
          type: form.type,
          dueDate: new Date(form.dueDate).toISOString(),
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data.task);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-base font-bold text-white">Neue Aufgabe</h2>
          <p className="text-xs text-blue-200 mt-0.5">Wiedervorlage oder Todo erstellen</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Typ</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all ${
                      form.type === key
                        ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Aufgabe</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="z.B. Kfz-Versicherung besprechen"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              autoFocus
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Kontakt</label>
            <input
              type="text"
              value={form.contactSearch}
              onChange={e => setForm(f => ({ ...f, contactSearch: e.target.value, contactId: "" }))}
              placeholder="Kontakt suchen..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {form.contactSearch && !form.contactId && filteredContacts.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setForm(f => ({ ...f, contactId: c.id, contactSearch: getContactName(c) }))}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{getContactName(c)}</span>
                    {c.company && <span className="text-gray-400 ml-1.5 text-xs">{c.company}</span>}
                  </button>
                ))}
              </div>
            )}
            {form.contactId && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Ausgewählt
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Fällig am
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notiz (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Zusätzliche Informationen..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Abbrechen
          </button>
          <button
            onClick={create}
            disabled={saving || !form.contactId || !form.title || !form.dueDate}
            className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? "Erstelle..." : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
