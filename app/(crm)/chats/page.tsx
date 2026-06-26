"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import ContactDrawer from "@/components/ContactDrawer";
import PageHeader from "@/components/PageHeader";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { contactName } from "@/lib/utils";

interface Conversation {
  id: string;
  contactId: string;
  channel: string;
  direction: string;
  content: string;
  subject: string | null;
  status: string | null;
  createdAt: string;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    phone: string | null;
    email: string | null;
  };
}

function contactInitial(c: Conversation["contact"]) {
  const name = contactName(c);
  return name.charAt(0).toUpperCase();
}

interface Group {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  _count?: { members: number };
}

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [channelFilter, setChannelFilter] = useState<"alle" | "whatsapp" | "email">("alle");
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);

  // Manual sync
  const [syncing, setSyncing] = useState(false);

  async function syncEmails() {
    setSyncing(true);
    try {
      const res  = await fetch("/api/messages/sync", { method: "POST" });
      const data = await res.json() as { gmail?: number; outlook?: number; strato?: number };
      const total = (data.gmail ?? 0) + (data.outlook ?? 0) + (data.strato ?? 0);
      await load();
      if (total > 0) {
        alert(`${total} neue Nachricht${total === 1 ? "" : "en"} synchronisiert.`);
      } else {
        alert("Keine neuen Nachrichten gefunden.");
      }
    } finally {
      setSyncing(false);
    }
  }

  // Broadcast state
  const [showBroadcast, setShowBroadcast]     = useState(false);
  const [groups, setGroups]                   = useState<Group[]>([]);
  const [broadcastGroup, setBroadcastGroup]   = useState<string>("");
  const [broadcastChannel, setBroadcastChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastResult, setBroadcastResult]   = useState<{ sent: number; failed: number; total: number } | null>(null);
  const broadcastTextareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(v: string) {
    const el = broadcastTextareaRef.current;
    if (!el) { setBroadcastContent(c => c + v); return; }
    const start = el.selectionStart ?? broadcastContent.length;
    const end   = el.selectionEnd   ?? broadcastContent.length;
    const next  = broadcastContent.slice(0, start) + v + broadcastContent.slice(end);
    setBroadcastContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setConversations(data.conversations || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openBroadcast() {
    setShowBroadcast(true);
    setBroadcastResult(null);
    setBroadcastContent("");
    setBroadcastSubject("");
    setBroadcastGroup("");
    const res = await fetch("/api/groups");
    const data = await res.json();
    setGroups(data.groups || []);
  }

  async function sendBroadcast() {
    if (!broadcastGroup || !broadcastContent) return;
    setSendingBroadcast(true);
    try {
      const res = await fetch("/api/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: broadcastGroup,
          channel: broadcastChannel,
          content: broadcastContent,
          subject: broadcastSubject || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setBroadcastResult(data);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Senden");
    } finally {
      setSendingBroadcast(false);
    }
  }

  const filtered = conversations.filter(c => {
    if (channelFilter !== "alle" && c.channel !== channelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = contactName(c.contact).toLowerCase();
      const content = c.content.toLowerCase();
      const subject = (c.subject || "").toLowerCase();
      if (!name.includes(q) && !content.includes(q) && !subject.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    alle:      conversations.length,
    whatsapp:  conversations.filter(c => c.channel === "whatsapp").length,
    email:     conversations.filter(c => c.channel === "email").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "var(--bg)" }}>
        <div
          className="w-6 h-6 rounded-full animate-spin"
          style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      <PageHeader
        title="Chats"
        subtitle="Alle Unterhaltungen mit deinen Kontakten"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={syncEmails}
              disabled={syncing}
              title="E-Mails jetzt synchronisieren"
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ background: "var(--input-bg)", color: "var(--text-secondary)", borderRadius: "9999px", padding: "8px 14px", border: "1px solid var(--border)" }}
            >
              <Icon icon="solar:refresh-linear" style={{ width: 15, height: 15, animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "Lädt..." : "Sync"}
            </button>
            <button
              onClick={openBroadcast}
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ background: "#F2EAD3", color: "#000", borderRadius: "9999px", padding: "8px 16px", border: "none" }}
            >
              <Icon icon="solar:users-group-two-rounded-linear" style={{ width: 15, height: 15 }} />
              Gruppennachricht
            </button>
          </div>
        }
      >
        {/* Search */}
        <div className="relative mb-3">
          <Icon
            icon="solar:magnifer-linear"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-secondary)", width: 14, height: 14 }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kontakt oder Nachricht suchen..."
            className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              transition: "all 150ms ease",
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--input-border)"; }}
          />
        </div>

        {/* Channel filter */}
        <div className="flex gap-1">
          {([
            { key: "alle",     label: "Alle",      count: counts.alle },
            { key: "whatsapp", label: "WhatsApp",   count: counts.whatsapp },
            { key: "email",    label: "E-Mail",     count: counts.email },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setChannelFilter(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: channelFilter === tab.key ? "#F2EAD3" : "var(--input-bg)",
                color: channelFilter === tab.key ? "#000000" : "var(--nav-text)",
                transition: "all 150ms ease",
              }}
            >
              {tab.key === "whatsapp" && <Icon icon="solar:chat-round-line-linear" style={{ width: 12, height: 12 }} />}
              {tab.key === "email"    && <Icon icon="solar:letter-linear" style={{ width: 12, height: 12 }} />}
              {tab.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: channelFilter === tab.key ? "rgba(0,0,0,0.15)" : "var(--border)",
                  color: channelFilter === tab.key ? "#000000" : "var(--nav-text)",
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </PageHeader>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}
            >
              <Icon icon="solar:chat-round-line-linear" style={{ color: "var(--text-dim)", width: 28, height: 28 }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Keine Chats</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Keine Treffer für deine Suche" : "Noch keine Nachrichten verschickt oder empfangen"}
            </p>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--surface-subtle)" }}>
            {filtered.map(conv => {
              const name    = contactName(conv.contact);
              const initial = contactInitial(conv.contact);
              const isInbound = conv.direction === "inbound";
              const isWhatsApp = conv.channel === "whatsapp";

              return (
                <button
                  key={conv.id}
                  onClick={() => setDrawerContactId(conv.contact.id)}
                  className="w-full flex items-start gap-4 px-6 py-4 text-left transition-colors"
                  style={{
                    borderBottom: "1px solid var(--surface-subtle)",
                    background: "transparent",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{ background: "var(--border)", color: "var(--text-secondary)" }}
                    >
                      {initial}
                    </div>
                    {/* Channel badge */}
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        background: isWhatsApp ? "#22C55E" : "#1B77BA",
                        border: "2px solid var(--bg)",
                      }}
                    >
                      <Icon
                        icon={isWhatsApp ? "solar:chat-round-line-linear" : "solar:letter-linear"}
                        style={{ color: "#FFFFFF", width: 8, height: 8 }}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {name}
                      </p>
                      <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                        {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true, locale: de })}
                      </span>
                    </div>

                    {conv.subject && (
                      <p className="text-xs font-medium truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {conv.subject}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon
                        icon={isInbound ? "solar:arrow-down-left-linear" : "solar:arrow-up-right-linear"}
                        style={{
                          color: isInbound ? "#F2EAD3" : "var(--text-tertiary)",
                          width: 12,
                          height: 12,
                          flexShrink: 0,
                        }}
                      />
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {conv.content.replace(/<[^>]+>/g, "").slice(0, 80)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {drawerContactId && (
        <ContactDrawer
          contactId={drawerContactId}
          onClose={() => setDrawerContactId(null)}
          initialTab="messages"
        />
      )}

      {/* Broadcast modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: 480, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Gruppennachricht</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Nachricht an alle Mitglieder einer Gruppe senden</p>
              </div>
              <button onClick={() => { setShowBroadcast(false); setBroadcastResult(null); }} style={{ color: "var(--text-secondary)" }}>
                <Icon icon="solar:close-circle-linear" style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {broadcastResult ? (
              /* Result screen */
              <div className="px-6 py-8 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.12)" }}>
                  <Icon icon="solar:check-circle-bold" style={{ color: "#22c55e", width: 28, height: 28 }} />
                </div>
                <p className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Gesendet!</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {broadcastResult.sent} von {broadcastResult.total} erfolgreich · {broadcastResult.failed} fehlgeschlagen
                </p>
                <button
                  onClick={() => { setShowBroadcast(false); setBroadcastResult(null); }}
                  className="mt-6 w-full py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: "#F2EAD3", color: "#000" }}
                >
                  Schließen
                </button>
              </div>
            ) : (
              /* Compose */
              <div className="px-6 py-5 space-y-4">
                {/* Group picker */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Gruppe *</label>
                  <select
                    value={broadcastGroup}
                    onChange={e => setBroadcastGroup(e.target.value)}
                    style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text-primary)", outline: "none" }}
                  >
                    <option value="">Gruppe auswählen...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id} style={{ background: "var(--surface)" }}>
                        {g.emoji ? `${g.emoji} ` : ""}{g.name} ({g._count?.members ?? 0} Kontakte)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Kanal *</label>
                  <div className="flex gap-2">
                    {([
                      { value: "whatsapp", label: "WhatsApp", icon: "solar:chat-round-line-linear", color: "#22c55e" },
                      { value: "email",    label: "E-Mail",   icon: "solar:letter-linear",          color: "#1B77BA" },
                    ] as const).map(ch => (
                      <button
                        key={ch.value}
                        onClick={() => setBroadcastChannel(ch.value)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{
                          border: broadcastChannel === ch.value ? `1px solid ${ch.color}66` : "1px solid var(--border)",
                          background: broadcastChannel === ch.value ? `${ch.color}18` : "var(--surface-subtle)",
                          color: broadcastChannel === ch.value ? ch.color : "var(--nav-text)",
                        }}
                      >
                        <Icon icon={ch.icon} style={{ width: 15, height: 15 }} />
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject (email only) */}
                {broadcastChannel === "email" && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Betreff *</label>
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={e => setBroadcastSubject(e.target.value)}
                      placeholder="Betreff der E-Mail..."
                      style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text-primary)", outline: "none" }}
                    />
                  </div>
                )}

                {/* Variables */}
                <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
                  <p className="text-xs font-medium mb-2" style={{ color: "rgba(251,191,36,0.8)" }}>Personalisierung — klicken zum Einfügen:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["{{vorname}}", "{{nachname}}", "{{name}}", "{{email}}", "{{telefon}}"].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="font-mono text-xs px-2 py-0.5 rounded transition-colors"
                        style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "rgba(251,191,36,0.9)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.2)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)"; }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nachricht *</label>
                  <textarea
                    ref={broadcastTextareaRef}
                    value={broadcastContent}
                    onChange={e => setBroadcastContent(e.target.value)}
                    rows={5}
                    placeholder={`Hallo {{vorname}},\n\ndeine Nachricht hier...`}
                    style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "none" }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowBroadcast(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={sendBroadcast}
                    disabled={sendingBroadcast || !broadcastGroup || !broadcastContent || (broadcastChannel === "email" && !broadcastSubject)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "#F2EAD3", color: "#000", opacity: (sendingBroadcast || !broadcastGroup || !broadcastContent) ? 0.5 : 1 }}
                  >
                    {sendingBroadcast && <div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000" }} />}
                    {sendingBroadcast ? "Wird gesendet..." : "An Gruppe senden"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
