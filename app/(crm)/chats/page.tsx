"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [channelFilter, setChannelFilter] = useState<"alle" | "whatsapp" | "email">("alle");
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);

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
      <div className="flex items-center justify-center h-full" style={{ background: "#111111" }}>
        <div
          className="w-6 h-6 rounded-full animate-spin"
          style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "#111111" }}>
      <PageHeader title="Chats" subtitle="Alle Unterhaltungen mit deinen Kontakten">
        {/* Search */}
        <div className="relative mb-3">
          <Icon
            icon="solar:magnifer-linear"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "rgba(255,255,255,0.4)", width: 14, height: 14 }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kontakt oder Nachricht suchen..."
            className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              color: "#FFFFFF",
              transition: "all 150ms ease",
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
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
                background: channelFilter === tab.key ? "#F2EAD3" : "rgba(255,255,255,0.06)",
                color: channelFilter === tab.key ? "#000000" : "rgba(255,255,255,0.5)",
                transition: "all 150ms ease",
              }}
            >
              {tab.key === "whatsapp" && <Icon icon="solar:chat-round-line-linear" style={{ width: 12, height: 12 }} />}
              {tab.key === "email"    && <Icon icon="solar:letter-linear" style={{ width: 12, height: 12 }} />}
              {tab.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: channelFilter === tab.key ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.08)",
                  color: channelFilter === tab.key ? "#000000" : "rgba(255,255,255,0.5)",
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
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Icon icon="solar:chat-round-line-linear" style={{ color: "rgba(255,255,255,0.15)", width: 28, height: 28 }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Keine Chats</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              {search ? "Keine Treffer für deine Suche" : "Noch keine Nachrichten verschickt oder empfangen"}
            </p>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
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
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: "transparent",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                    >
                      {initial}
                    </div>
                    {/* Channel badge */}
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        background: isWhatsApp ? "#22C55E" : "#3B82F6",
                        border: "2px solid #111111",
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
                      <p className="text-sm font-semibold truncate" style={{ color: "#FFFFFF" }}>
                        {name}
                      </p>
                      <span className="text-[11px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true, locale: de })}
                      </span>
                    </div>

                    {conv.subject && (
                      <p className="text-xs font-medium truncate mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {conv.subject}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon
                        icon={isInbound ? "solar:arrow-down-left-linear" : "solar:arrow-up-right-linear"}
                        style={{
                          color: isInbound ? "#F2EAD3" : "rgba(255,255,255,0.3)",
                          width: 12,
                          height: 12,
                          flexShrink: 0,
                        }}
                      />
                      <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
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
    </div>
  );
}
