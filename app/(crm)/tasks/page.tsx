"use client";

import { useState, useEffect, useCallback } from "react";
import ContactDrawer from "@/components/ContactDrawer";
import PageHeader from "@/components/PageHeader";
import { Icon } from "@iconify/react";
import { format, isToday, isTomorrow, isPast, isThisWeek } from "date-fns";
import { de } from "date-fns/locale";
import { contactName, formatDue } from "@/lib/utils";

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
  iconName: string;
  color: string;
  bg: string;
}> = {
  call:    { label: "Anruf",   iconName: "solar:phone-linear",     color: "rgba(52,211,153,1)",   bg: "rgba(52,211,153,0.1)" },
  email:   { label: "E-Mail",  iconName: "solar:letter-linear",    color: "rgba(96,165,250,1)",   bg: "rgba(96,165,250,0.1)" },
  meeting: { label: "Meeting", iconName: "solar:users-group-rounded-linear", color: "rgba(167,139,250,1)", bg: "rgba(167,139,250,0.1)" },
  todo:    { label: "Aufgabe", iconName: "solar:checklist-linear", color: "rgba(251,191,36,1)",   bg: "rgba(251,191,36,0.1)" },
};

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
  borderRadius: "16px",
  background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 12px)",
  boxShadow: "rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.1) 0px 8px 10px -6px, rgba(0,0,0,0.25) 0px 25px 50px -12px",
};

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div style={{ ...gradientBorderCard, width: "100%", maxWidth: "448px" }} onClick={e => e.stopPropagation()}>
        <div style={{ borderRadius: "15px", background: "#1C1C1C" }}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 pt-6 pb-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(242,234,211,0.1)" }}>
                <Icon icon="solar:calendar-linear" style={{ color: "#F2EAD3", width: 18, height: 18 }} />
              </div>
              <div>
                <h2 className="text-base" style={{ color: "#FFFFFF", fontWeight: 400 }}>Kalender-Sync</h2>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Aufgaben ins iPhone / Google eintragen</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                Deine persönliche Kalender-URL
              </label>
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <code className="flex-1 text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{feedUrl}</code>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: copied ? "#F2EAD3" : "rgba(255,255,255,0.1)",
                    color: copied ? "#000000" : "rgba(255,255,255,0.7)",
                  }}
                >
                  <Icon icon={copied ? "solar:check-circle-linear" : "solar:copy-linear"} style={{ width: 12, height: 12 }} />
                  {copied ? "Kopiert!" : "Kopieren"}
                </button>
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                <span className="text-base">📱</span> iPhone / Apple Calendar
              </p>
              <ol className="text-xs space-y-1 pl-4 list-decimal" style={{ color: "rgba(255,255,255,0.4)" }}>
                <li>URL oben kopieren</li>
                <li><strong style={{ color: "rgba(255,255,255,0.6)" }}>Kalender</strong>-App öffnen → unten links <strong style={{ color: "rgba(255,255,255,0.6)" }}>Kalender</strong></li>
                <li><strong style={{ color: "rgba(255,255,255,0.6)" }}>Kalenderabo hinzufügen</strong> tippen</li>
                <li>URL einfügen → <strong style={{ color: "rgba(255,255,255,0.6)" }}>Abonnieren</strong></li>
              </ol>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                <span className="text-base">📆</span> Google Calendar
              </p>
              <ol className="text-xs space-y-1 pl-4 list-decimal" style={{ color: "rgba(255,255,255,0.4)" }}>
                <li>URL oben kopieren</li>
                <li><a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "#F2EAD3", textDecoration: "underline" }}>calendar.google.com</a> öffnen</li>
                <li>Links auf <strong style={{ color: "rgba(255,255,255,0.6)" }}>+</strong> neben „Andere Kalender"</li>
                <li><strong style={{ color: "rgba(255,255,255,0.6)" }}>Per URL</strong> → URL einfügen → <strong style={{ color: "rgba(255,255,255,0.6)" }}>Kalender hinzufügen</strong></li>
              </ol>
            </div>

            <p className="text-[11px] text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
              Der Kalender aktualisiert sich automatisch stündlich. Nur offene Aufgaben werden synchronisiert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
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
    { key: "overdue", label: "Überfällig",  tasks: overdue, dotColor: "#EF4444",            accentColor: "#EF4444" },
    { key: "today",   label: "Heute",        tasks: today,   dotColor: "rgba(251,146,60,1)", accentColor: "rgba(251,146,60,1)" },
    { key: "week",    label: "Diese Woche",  tasks: week,    dotColor: "rgba(250,204,21,1)", accentColor: "rgba(250,204,21,1)" },
    { key: "later",   label: "Später",       tasks: later,   dotColor: "rgba(255,255,255,0.3)", accentColor: "rgba(255,255,255,0.4)" },
  ];

  return (
    <div className="min-h-full" style={{ background: "#111111" }}>
      <PageHeader
        title="Aufgaben"
        subtitle={totalPending > 0
          ? `${totalPending} offen${overdue.length > 0 ? ` · ${overdue.length} überfällig` : ""}`
          : "Keine offenen Aufgaben"}
        actions={
          <>
            <button
              onClick={() => setShowIcal(true)}
              className="flex items-center gap-2 font-semibold text-sm"
              style={{
                background: "#3B82F6",
                color: "#FFFFFF",
                borderRadius: "9999px",
                padding: "10px 20px",
                border: "1px solid rgba(59,130,246,0.5)",
                transition: "all 150ms ease",
              }}
              title="In Kalender abonnieren"
            >
              <Icon icon="solar:calendar-linear" style={{ width: 16, height: 16 }} />
              <span className="hidden sm:inline">Kalender-Sync</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
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
              Neue Aufgabe
            </button>
          </>
        }
      >
        {/* Filter tabs */}
        <div className="flex gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
              style={{
                background: filter === tab.key ? "#F2EAD3" : "transparent",
                color: filter === tab.key ? "#000000" : "rgba(255,255,255,0.5)",
                transition: "all 150ms ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="w-7 h-7 rounded-full animate-spin"
              style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }}
            />
          </div>
        ) : totalPending === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "rgba(242,234,211,0.1)" }}
            >
              <Icon icon="solar:check-circle-linear" style={{ color: "#F2EAD3", width: 36, height: 36 }} />
            </div>
            <h3 className="text-lg mb-1" style={{ color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>Alles erledigt!</h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Keine offenen Aufgaben. Füge eine neue Wiedervorlage hinzu.
            </p>
            <button
              onClick={() => setShowModal(true)}
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
                accentColor={section.accentColor}
                dotColor={section.dotColor}
                urgency={section.key}
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
              className="flex items-center gap-2 text-xs font-semibold mb-3 transition-colors px-1"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <Icon
                icon={showDone ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                style={{ width: 14, height: 14 }}
              />
              {done.length} erledigte Aufgabe{done.length !== 1 ? "n" : ""}
            </button>
            {showDone && (
              <div className="space-y-2" style={{ opacity: 0.5 }}>
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
  label, tasks, accentColor, dotColor, urgency, completing, onComplete, onDelete, onContactClick,
}: {
  label: string; tasks: Task[]; accentColor: string; dotColor: string; urgency: string;
  completing: string | null;
  onComplete: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onContactClick: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>{label}</h2>
        <span className="text-xs font-bold" style={{ color: accentColor, opacity: 0.6 }}>{tasks.length}</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
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
  const isCompleting = completing === task.id;
  const due = new Date(task.dueDate);
  const [hovered, setHovered] = useState(false);

  const borderLeftColor = urgency === "overdue" ? "#EF4444"
    : urgency === "today" ? "rgba(251,146,60,1)"
    : urgency === "week" ? "rgba(250,204,21,1)"
    : "rgba(255,255,255,0.1)";

  return (
    <div
      onClick={() => onContactClick(task.contact.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `4px solid ${borderLeftColor}`,
        opacity: isCompleting || task.completed ? 0.6 : 1,
        transform: isCompleting ? "scale(0.99)" : "scale(1)",
        transition: "all 150ms ease",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(task.id, !task.completed); }}
        className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200"
        style={{
          background: task.completed ? "#F2EAD3" : "transparent",
          borderColor: task.completed ? "#F2EAD3" : "rgba(255,255,255,0.3)",
        }}
      >
        {task.completed && <Icon icon="solar:check-circle-linear" style={{ color: "#000000", width: 12, height: 12 }} />}
      </button>

      {/* Type icon */}
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.bg }}
      >
        <Icon icon={cfg.iconName} style={{ color: cfg.color, width: 14, height: 14 }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-semibold leading-snug"
            style={{
              color: task.completed ? "rgba(255,255,255,0.3)" : "#FFFFFF",
              textDecoration: task.completed ? "line-through" : "none",
            }}
          >
            {task.title}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-1.5 rounded-lg flex-shrink-0 transition-all"
            style={{
              opacity: hovered ? 1 : 0,
              color: "rgba(255,255,255,0.3)",
              background: "transparent",
              transition: "all 150ms ease",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Icon icon="solar:trash-bin-linear" style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: "#F2EAD3" }}>
            {contactName(task.contact)}
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: urgency === "overdue" ? "#EF4444" : "rgba(255,255,255,0.4)" }}
          >
            <Icon
              icon={urgency === "overdue" ? "solar:danger-triangle-linear" : "solar:clock-circle-linear"}
              style={{ width: 12, height: 12 }}
            />
            {formatDue(due)}
          </span>
          {task.notes && (
            <>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span className="text-xs truncate max-w-[160px]" style={{ color: "rgba(255,255,255,0.4)" }}>{task.notes}</span>
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
    dueTime: "",
    notes: "",
    contactSearch: "",
  });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredContacts = contacts
    .filter(c => contactName(c).toLowerCase().includes(form.contactSearch.toLowerCase()))
    .slice(0, 8);

  async function create() {
    if (!form.contactId || !form.title || !form.dueDate) return;
    setSaving(true);
    setError(null);

    const dueDateISO = form.dueTime
      ? new Date(`${form.dueDate}T${form.dueTime}`).toISOString()
      : new Date(form.dueDate).toISOString();

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

  const gradientBorderModal = {
    padding: "1px",
    borderRadius: "16px",
    background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 12px)",
    boxShadow: "rgba(0,0,0,0.25) 0px 25px 50px -12px",
    width: "100%",
    maxWidth: "448px",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div style={gradientBorderModal} onClick={e => e.stopPropagation()}>
        <div style={{ borderRadius: "15px", background: "#1C1C1C", overflow: "hidden" }}>
          {/* Header */}
          <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(242,234,211,0.1)" }}>
              <Icon icon="solar:checklist-linear" style={{ color: "#F2EAD3", width: 18, height: 18 }} />
            </div>
            <div>
              <h2 className="text-base" style={{ color: "#FFFFFF", fontWeight: 400 }}>Neue Aufgabe</h2>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Wiedervorlage oder Todo erstellen</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Typ</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-150"
                    style={{
                      border: `2px solid ${form.type === key ? cfg.color : "rgba(255,255,255,0.1)"}`,
                      background: form.type === key ? cfg.bg : "transparent",
                      color: form.type === key ? cfg.color : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <Icon icon={cfg.iconName} style={{ width: 16, height: 16 }} />
                    <span className="text-[10px] font-bold">{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Aufgabe</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="z.B. Kfz-Versicherung besprechen"
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                autoFocus
              />
            </div>

            {/* Contact search */}
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Kontakt</label>
              <input
                type="text"
                value={form.contactSearch}
                onChange={e => {
                  setForm(f => ({ ...f, contactSearch: e.target.value, contactId: "" }));
                  setShowDropdown(true);
                }}
                placeholder="Kontakt suchen..."
                style={inputStyle}
                onFocus={(e) => { setShowDropdown(true); (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
              {showDropdown && form.contactSearch && !form.contactId && filteredContacts.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                  style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                >
                  {filteredContacts.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => {
                        setForm(f => ({ ...f, contactId: c.id, contactSearch: contactName(c) }));
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        color: "#FFFFFF",
                        background: "transparent",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span className="font-semibold">{contactName(c)}</span>
                      {c.company && <span className="ml-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{c.company}</span>}
                    </button>
                  ))}
                </div>
              )}
              {form.contactId && (
                <p className="text-xs mt-1.5 flex items-center gap-1 font-semibold" style={{ color: "#F2EAD3" }}>
                  <Icon icon="solar:check-circle-linear" style={{ width: 12, height: 12 }} /> Kontakt ausgewählt
                </p>
              )}
            </div>

            {/* Date + Time */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                <Icon icon="solar:calendar-linear" style={{ width: 11, height: 11 }} /> Datum &amp; Uhrzeit
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
                <input
                  type="time"
                  value={form.dueTime}
                  onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                  placeholder="Uhrzeit (optional)"
                />
              </div>
              <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Icon icon="solar:calendar-linear" style={{ width: 10, height: 10 }} />
                {form.dueTime
                  ? "Erscheint mit Uhrzeit in deinem Kalender"
                  : "Ohne Uhrzeit = ganztägiger Termin im Kalender"}
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Notiz <span className="normal-case font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Zusätzliche Informationen..."
                rows={2}
                style={{ ...inputStyle, resize: "none" }}
                onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 text-xs rounded-xl px-3 py-2.5"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}
              >
                <Icon icon="solar:danger-triangle-linear" style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center font-semibold text-sm"
              style={{
                background: "#3B82F6",
                color: "#FFFFFF",
                borderRadius: "9999px",
                padding: "10px 32px",
                border: "1px solid rgba(59,130,246,0.5)",
                transition: "all 150ms ease",
              }}
            >
              Abbrechen
            </button>
            <button
              onClick={create}
              disabled={saving || !form.contactId || !form.title || !form.dueDate}
              className="flex-1 flex items-center justify-center gap-2 font-semibold text-sm"
              style={{
                background: "#F2EAD3",
                color: "#000000",
                borderRadius: "9999px",
                padding: "8px 20px",
                border: "none",
                opacity: (saving || !form.contactId || !form.title || !form.dueDate) ? 0.5 : 1,
                transition: "all 150ms ease",
              }}
            >
              {saving ? (
                <>
                  <div
                    className="w-3.5 h-3.5 rounded-full animate-spin"
                    style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }}
                  />
                  Erstelle...
                </>
              ) : "Erstellen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
