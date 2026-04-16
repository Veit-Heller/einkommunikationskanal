"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ContactDrawer from "@/components/ContactDrawer";
import {
  Phone, Mail, Users, CheckSquare, Plus, Trash2,
  ClipboardList, ChevronDown, ChevronUp, Check,
  Calendar, AlertCircle, Clock, Inbox, Sparkles,
  CalendarDays, Copy, CheckCheck, X,
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

const TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  call:    { label: "Anruf",   icon: Phone,       color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-300" },
  email:   { label: "E-Mail",  icon: Mail,        color: "text-sky-700",     bg: "bg-sky-50",      border: "border-sky-300" },
  meeting: { label: "Meeting", icon: Users,       color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-300" },
  todo:    { label: "Aufgabe", icon: CheckSquare, color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-300" },
};

function getContactName(c: Contact) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "Unbekannt";
}

// All-day = stored as UTC midnight (no time was specified)
function isAllDay(date: Date): boolean {
  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
}

function formatDue(date: Date) {
  const allDay = isAllDay(date);
  const timeSuffix = allDay ? "" : ` · ${format(date, "HH:mm")} Uhr`;

  if (isPast(date) && !isToday(date))
    return `Seit ${formatDistanceToNow(date, { locale: de })}${timeSuffix}`;
  if (isToday(date)) return `Heute${timeSuffix}`;
  if (isTomorrow(date)) return `Morgen${timeSuffix}`;
  return format(date, "EEE, d. MMM", { locale: de }) + timeSuffix;
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
  const asc = (a: Task, b: Task) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  return {
    overdue: overdue.sort(asc),
    today:   today.sort(asc),
    week:    week.sort(asc),
    later:   later.sort(asc),
    done:    done.sort(asc),
  };
}

const FILTER_TABS = [
  { key: "all",     label: "Alle" },
  { key: "call",    label: "Anrufe" },
  { key: "email",   label: "E-Mails" },
  { key: "meeting", label: "Meetings" },
  { key: "todo",    label: "Aufgaben" },
];

// ── iCal Subscribe Modal ─────────────────────────────────────────────────────

function ICalModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const feedUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/calendar/ical`
    : "/api/calendar/ical";

  async function copy() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 w-full max-w-md border border-slate-100" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-lime-50 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-4.5 h-4.5 text-lime-600" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Kalender-Sync</h2>
              <p className="text-xs text-slate-400">Aufgaben ins iPhone / Google eintragen</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* URL */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Deine persönliche Kalender-URL
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <code className="flex-1 text-xs text-slate-600 truncate">{feedUrl}</code>
              <button
                onClick={copy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  copied
                    ? "bg-lime-500 text-white"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}
              >
                {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
                {copied ? "Kopiert!" : "Kopieren"}
              </button>
            </div>
          </div>

          {/* iPhone */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="text-base">📱</span> iPhone / Apple Calendar
            </p>
            <ol className="text-xs text-slate-500 space-y-1 pl-4 list-decimal">
              <li>URL oben kopieren</li>
              <li><strong>Kalender</strong>-App öffnen → unten links <strong>Kalender</strong></li>
              <li><strong>Kalenderabo hinzufügen</strong> tippen</li>
              <li>URL einfügen → <strong>Abonnieren</strong></li>
            </ol>
          </div>

          {/* Google */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="text-base">📆</span> Google Calendar
            </p>
            <ol className="text-xs text-slate-500 space-y-1 pl-4 list-decimal">
              <li>URL oben kopieren</li>
              <li><a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-lime-600 underline">calendar.google.com</a> öffnen</li>
              <li>Links auf <strong>+</strong> neben „Andere Kalender"</li>
              <li><strong>Per URL</strong> → URL einfügen → <strong>Kalender hinzufügen</strong></li>
            </ol>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Der Kalender aktualisiert sich automatisch stündlich. Nur offene Aufgaben werden synchronisiert.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");
  const [showDone, setShowDone]     = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [showIcal, setShowIcal]     = useState(false);
  const [contacts, setContacts]     = useState<Contact[]>([]);
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);

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
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t
    ));
    setTimeout(() => setCompleting(null), 400);
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const filtered     = filter === "all" ? tasks : tasks.filter(t => t.type === filter);
  const { overdue, today, week, later, done } = groupTasks(filtered);
  const totalPending = overdue.length + today.length + week.length + later.length;

  const sections = [
    { key: "overdue", label: "Überfällig",  tasks: overdue, dot: "bg-red-400",    accent: "text-red-600",    urgency: "overdue" },
    { key: "today",   label: "Heute",        tasks: today,   dot: "bg-orange-400", accent: "text-orange-600", urgency: "today" },
    { key: "week",    label: "Diese Woche",  tasks: week,    dot: "bg-yellow-400", accent: "text-yellow-600", urgency: "week" },
    { key: "later",   label: "Später",       tasks: later,   dot: "bg-slate-300",  accent: "text-slate-500",  urgency: "later" },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lime-50 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-lime-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Aufgaben</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {totalPending > 0 ? (
                    <>
                      <span className="font-semibold text-slate-600">{totalPending}</span> offen
                      {overdue.length > 0 && (
                        <span className="text-red-500 font-semibold ml-1.5">· {overdue.length} überfällig</span>
                      )}
                    </>
                  ) : "Keine offenen Aufgaben"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* iCal subscribe button */}
              <button
                onClick={() => setShowIcal(true)}
                className="btn-secondary gap-2"
                title="In Kalender abonnieren"
              >
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Kalender-Sync</span>
              </button>

              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                Neue Aufgabe
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-4">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  filter === tab.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalPending === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-lime-50 rounded-3xl flex items-center justify-center mb-5">
              <Sparkles className="w-9 h-9 text-lime-400" />
            </div>
            <h3 className="font-bold text-slate-700 text-lg mb-1">Alles erledigt!</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              Keine offenen Aufgaben. Füge eine neue Wiedervorlage hinzu.
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Neue Aufgabe
            </button>
          </div>
        ) : (
          sections.map(section =>
            section.tasks.length > 0 && (
              <TaskSection
                key={section.key}
                label={section.label}
                tasks={section.tasks}
                accent={section.accent}
                dot={section.dot}
                urgency={section.urgency}
                completing={completing}
                onComplete={completeTask}
                onDelete={deleteTask}
                onContactClick={(id) => setDrawerContactId(id)}
              />
            )
          )
        )}

        {/* Done section */}
        {done.length > 0 && (
          <div>
            <button
              onClick={() => setShowDone(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 mb-3 transition-colors px-1"
            >
              {showDone ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {done.length} erledigte Aufgabe{done.length !== 1 ? "n" : ""}
            </button>
            {showDone && (
              <div className="space-y-2 opacity-50">
                {done.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    urgency="done"
                    completing={completing}
                    onComplete={completeTask}
                    onDelete={deleteTask}
                    onContactClick={(id) => setDrawerContactId(id)}
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

      {showIcal && <ICalModal onClose={() => setShowIcal(false)} />}

      {drawerContactId && (
        <ContactDrawer
          contactId={drawerContactId}
          onClose={() => setDrawerContactId(null)}
        />
      )}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

function TaskSection({
  label, tasks, accent, dot, urgency, completing, onComplete, onDelete, onContactClick,
}: {
  label: string; tasks: Task[]; accent: string; dot: string; urgency: string;
  completing: string | null;
  onComplete: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onContactClick: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <h2 className={`text-[11px] font-bold uppercase tracking-widest ${accent}`}>{label}</h2>
        <span className={`text-xs font-bold ${accent} opacity-60`}>{tasks.length}</span>
        <div className="flex-1 h-px bg-slate-100" />
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

// ── Card ─────────────────────────────────────────────────────────────────────

function TaskCard({
  task, urgency, completing, onComplete, onDelete, onContactClick,
}: {
  task: Task; urgency: string; completing: string | null;
  onComplete: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onContactClick: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.todo;
  const Icon = cfg.icon;
  const isCompleting = completing === task.id;
  const due = new Date(task.dueDate);

  const cardStyle: Record<string, string> = {
    overdue: "border-l-red-300 bg-red-50/40",
    today:   "border-l-orange-300 bg-orange-50/30",
    week:    "border-l-yellow-300 bg-yellow-50/20",
    later:   "border-l-slate-200 bg-white",
    done:    "border-l-slate-100 bg-white",
  };

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-2xl border border-slate-100 border-l-4
        ${cardStyle[urgency] ?? "bg-white"} hover:shadow-sm transition-all duration-200
        ${isCompleting ? "scale-[0.99] opacity-60" : ""}
        ${task.completed ? "opacity-50" : ""}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onComplete(task.id, !task.completed)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
          task.completed
            ? "bg-lime-500 border-lime-500"
            : "border-slate-300 hover:border-lime-500 hover:bg-lime-50"
        }`}
      >
        {task.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      {/* Type icon */}
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold text-slate-800 leading-snug ${
            task.completed ? "line-through text-slate-400" : ""
          }`}>
            {task.title}
          </p>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-200 hover:text-red-400 transition-all flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <button
            onClick={() => onContactClick(task.contact.id)}
            className="text-xs text-lime-600 hover:text-lime-700 hover:underline font-semibold transition-colors"
          >
            {getContactName(task.contact)}
          </button>
          <span className="text-slate-200 text-xs">·</span>
          <span className={`flex items-center gap-1 text-xs font-medium ${
            urgency === "overdue" ? "text-red-500" : "text-slate-400"
          }`}>
            {urgency === "overdue"
              ? <AlertCircle className="w-3 h-3" />
              : <Clock className="w-3 h-3" />}
            {formatDue(due)}
          </span>
          {task.notes && (
            <>
              <span className="text-slate-200 text-xs">·</span>
              <span className="text-xs text-slate-400 truncate max-w-[160px]">{task.notes}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Modal ─────────────────────────────────────────────────────────────

function TaskCreateModal({
  contacts, onClose, onCreated,
}: {
  contacts: Contact[];
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [form, setForm] = useState({
    contactId: "",
    title: "",
    type: "call",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    dueTime: "",   // optional time HH:MM
    notes: "",
    contactSearch: "",
  });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredContacts = contacts
    .filter(c => getContactName(c).toLowerCase().includes(form.contactSearch.toLowerCase()))
    .slice(0, 8);

  async function create() {
    if (!form.contactId || !form.title || !form.dueDate) return;
    setSaving(true);
    setError(null);

    // Build datetime: with time → local datetime, without → UTC midnight (all-day)
    const dueDateISO = form.dueTime
      ? new Date(`${form.dueDate}T${form.dueTime}`).toISOString()
      : new Date(form.dueDate).toISOString(); // date-only → UTC midnight

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: form.contactId,
          title: form.title,
          type: form.type,
          dueDate: dueDateISO,
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
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 w-full max-w-md border border-slate-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-lime-50 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-4.5 h-4.5 text-lime-600" size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Neue Aufgabe</h2>
            <p className="text-xs text-slate-400">Wiedervorlage oder Todo erstellen</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Typ</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-150 ${
                      form.type === key
                        ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                        : "border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-bold">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Aufgabe</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="z.B. Kfz-Versicherung besprechen"
              className="input"
              autoFocus
            />
          </div>

          {/* Contact search */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kontakt</label>
            <input
              type="text"
              value={form.contactSearch}
              onChange={e => {
                setForm(f => ({ ...f, contactSearch: e.target.value, contactId: "" }));
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Kontakt suchen..."
              className="input"
            />
            {showDropdown && form.contactSearch && !form.contactId && filteredContacts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden z-10">
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => {
                      setForm(f => ({ ...f, contactId: c.id, contactSearch: getContactName(c) }));
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-lime-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <span className="font-semibold text-slate-800">{getContactName(c)}</span>
                    {c.company && <span className="text-slate-400 ml-2 text-xs">{c.company}</span>}
                  </button>
                ))}
              </div>
            )}
            {form.contactId && (
              <p className="text-xs text-lime-600 mt-1.5 flex items-center gap-1 font-semibold">
                <Check className="w-3 h-3" /> Kontakt ausgewählt
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar size={11} /> Datum &amp; Uhrzeit
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="input"
              />
              <input
                type="time"
                value={form.dueTime}
                onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                className="input"
                placeholder="Uhrzeit (optional)"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <CalendarDays size={10} />
              {form.dueTime
                ? "Erscheint mit Uhrzeit in deinem Kalender"
                : "Ohne Uhrzeit = ganztägiger Termin im Kalender"}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Notiz <span className="normal-case font-normal text-slate-300">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Zusätzliche Informationen..."
              rows={2}
              className="input resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Abbrechen
          </button>
          <button
            onClick={create}
            disabled={saving || !form.contactId || !form.title || !form.dueDate}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Erstelle...
              </>
            ) : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
