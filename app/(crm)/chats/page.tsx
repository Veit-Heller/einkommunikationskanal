"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, MessageCircle, Mail, Search,
  Loader2, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <PageHeader title="Chats" subtitle="Alle Unterhaltungen mit deinen Kontakten">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kontakt oder Nachricht suchen..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                channelFilter === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab.key === "whatsapp" && <MessageCircle className="w-3 h-3" />}
              {tab.key === "email"    && <Mail className="w-3 h-3" />}
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                channelFilter === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-500"
              }`}>
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
            <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare className="w-7 h-7 text-slate-200" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Keine Chats</p>
            <p className="text-xs text-slate-300 mt-1">
              {search ? "Keine Treffer für deine Suche" : "Noch keine Nachrichten verschickt oder empfangen"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(conv => {
              const name    = contactName(conv.contact);
              const initial = contactInitial(conv.contact);
              const isInbound = conv.direction === "inbound";
              const isWhatsApp = conv.channel === "whatsapp";

              return (
                <button
                  key={conv.id}
                  onClick={() => setDrawerContactId(conv.contact.id)}
                  className="w-full flex items-start gap-4 px-6 py-4 hover:bg-white transition-colors text-left group"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 group-hover:from-lime-100 group-hover:to-lime-200 group-hover:text-lime-700 transition-all">
                      {initial}
                    </div>
                    {/* Channel badge */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      isWhatsApp ? "bg-emerald-500" : "bg-sky-500"
                    }`}>
                      {isWhatsApp
                        ? <MessageCircle className="w-2 h-2 text-white" />
                        : <Mail className="w-2 h-2 text-white" />
                      }
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900">
                        {name}
                      </p>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true, locale: de })}
                      </span>
                    </div>

                    {/* Subject for emails */}
                    {conv.subject && (
                      <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
                        {conv.subject}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Direction icon */}
                      {isInbound
                        ? <ArrowDownLeft className="w-3 h-3 text-lime-500 flex-shrink-0" />
                        : <ArrowUpRight  className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      }
                      <p className="text-xs text-slate-400 truncate">
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
