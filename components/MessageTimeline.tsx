"use client";

import { useState, useRef, useEffect } from "react";
import { Mail, MessageCircle, Send, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Message {
  id: string;
  createdAt: string;
  channel: string;
  direction: string;
  content: string;
  subject: string | null;
  status: string | null;
  sentAt: string | null;
}

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

interface MessageTimelineProps {
  contact: Contact;
  initialMessages: Message[];
}

type ComposeTab = "whatsapp" | "email";

export default function MessageTimeline({
  contact,
  initialMessages,
}: MessageTimelineProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeTab, setActiveTab] = useState<ComposeTab>("whatsapp");
  const [messageText, setMessageText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/contacts/${contact.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.contact.messages);
        }
      } catch {
        // ignore polling errors silently
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [contact.id]);

  async function sendMessage() {
    if (!messageText.trim()) return;
    if (activeTab === "email" && !emailSubject.trim()) {
      setError("Bitte geben Sie einen Betreff ein.");
      return;
    }
    if (activeTab === "whatsapp" && !contact.phone) {
      setError("Kein WhatsApp-Nummer für diesen Kontakt hinterlegt.");
      return;
    }
    if (activeTab === "email" && !contact.email) {
      setError("Keine E-Mail-Adresse für diesen Kontakt hinterlegt.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          channel: activeTab,
          content: messageText,
          subject: activeTab === "email" ? emailSubject : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Senden");
      }

      setMessages((prev) => [...prev, data.message]);
      setMessageText("");
      if (activeTab === "email") setEmailSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: de,
      });
    } catch {
      return dateStr;
    }
  }

  function getStatusLabel(status: string | null) {
    switch (status) {
      case "sent":
        return "Gesendet";
      case "delivered":
        return "Zugestellt";
      case "read":
        return "Gelesen";
      case "failed":
        return "Fehlgeschlagen";
      default:
        return null;
    }
  }

  const grouped: Array<{ date: string; msgs: Message[] }> = [];
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date, msgs: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-medium text-sm">Noch keine Nachrichten</p>
            <p className="text-xs mt-1">
              Starten Sie eine Konversation unten.
            </p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {group.msgs.map((msg) => {
              const isOutbound = msg.direction === "outbound";
              const isEmail = msg.channel === "email";

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3`}
                >
                  {!isOutbound && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                      {isEmail ? (
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] ${isOutbound ? "items-end" : "items-start"} flex flex-col gap-1`}
                  >
                    {/* Channel badge */}
                    <div
                      className={`flex items-center gap-1 text-xs ${isOutbound ? "justify-end" : "justify-start"}`}
                    >
                      {isEmail ? (
                        <span className="inline-flex items-center gap-1 text-blue-500">
                          <Mail className="w-3 h-3" /> E-Mail
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-500">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </span>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        isOutbound
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {msg.subject && (
                        <div
                          className={`text-xs font-semibold mb-1 ${isOutbound ? "text-blue-200" : "text-gray-500"}`}
                        >
                          Betreff: {msg.subject}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>

                    {/* Time & status */}
                    <div
                      className={`flex items-center gap-2 text-xs text-gray-400 ${isOutbound ? "flex-row-reverse" : ""}`}
                    >
                      <span>{formatTime(msg.createdAt)}</span>
                      {isOutbound && msg.status && (
                        <span
                          className={`${msg.status === "failed" ? "text-red-400" : msg.status === "read" ? "text-blue-400" : "text-gray-400"}`}
                        >
                          {getStatusLabel(msg.status)}
                        </span>
                      )}
                    </div>
                  </div>

                  {isOutbound && (
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center ml-2 flex-shrink-0 self-end mb-1">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="border-t border-gray-100 bg-white p-4">
        {/* Tabs */}
        <div className="flex border border-gray-200 rounded-lg p-0.5 mb-3 w-fit">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "whatsapp"
                ? "bg-green-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("whatsapp")}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "email"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("email")}
          >
            <Mail className="w-3.5 h-3.5" />
            E-Mail
          </button>
        </div>

        {/* Email subject */}
        {activeTab === "email" && (
          <input
            type="text"
            placeholder="Betreff..."
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Compose */}
        <div className="flex items-end gap-2">
          <textarea
            placeholder={
              activeTab === "whatsapp"
                ? "WhatsApp Nachricht..."
                : "E-Mail verfassen..."
            }
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={3}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !messageText.trim()}
            className={`p-2.5 rounded-xl text-white transition-all flex-shrink-0 ${
              activeTab === "whatsapp"
                ? "bg-green-500 hover:bg-green-600 disabled:bg-green-300"
                : "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300"
            } disabled:cursor-not-allowed`}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Enter zum Senden · Shift+Enter für neue Zeile
        </p>
      </div>
    </div>
  );
}
