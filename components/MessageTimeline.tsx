"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
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
  mediaUrl: string | null;
  mediaName: string | null;
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

export default function MessageTimeline({ contact, initialMessages }: MessageTimelineProps) {
  const [messages, setMessages]       = useState<Message[]>(initialMessages);
  const [activeTab, setActiveTab]     = useState<ComposeTab>("whatsapp");
  const [messageText, setMessageText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [sending, setSending]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/contacts/${contact.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.contact.messages);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [contact.id]);

  async function sendMessage() {
    if (!messageText.trim() && !attachedFile) return;
    if (activeTab === "email" && !emailSubject.trim()) { setError("Bitte geben Sie einen Betreff ein."); return; }
    if (activeTab === "whatsapp" && !contact.phone) { setError("Kein WhatsApp-Nummer für diesen Kontakt hinterlegt."); return; }
    if (activeTab === "email" && !contact.email) { setError("Keine E-Mail-Adresse für diesen Kontakt hinterlegt."); return; }

    setSending(true);
    setError(null);

    try {
      let body: FormData | string;
      let headers: Record<string, string>;

      if (attachedFile) {
        const fd = new FormData();
        fd.append("contactId", contact.id);
        fd.append("channel", activeTab);
        fd.append("content", messageText);
        if (activeTab === "email" && emailSubject) fd.append("subject", emailSubject);
        fd.append("file", attachedFile);
        body = fd;
        headers = {};
      } else {
        body = JSON.stringify({
          contactId: contact.id,
          channel: activeTab,
          content: messageText,
          subject: activeTab === "email" ? emailSubject : undefined,
        });
        headers = { "Content-Type": "application/json" };
      }

      const res = await fetch("/api/messages", { method: "POST", headers, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Senden");

      setMessages(prev => [...prev, data.message]);
      setMessageText("");
      setAttachedFile(null);
      if (activeTab === "email") setEmailSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: de }); }
    catch { return dateStr; }
  }

  function getStatusLabel(status: string | null) {
    switch (status) {
      case "sent":      return "Gesendet";
      case "delivered": return "Zugestellt";
      case "read":      return "Gelesen";
      case "failed":    return "Fehlgeschlagen";
      default:          return null;
    }
  }

  const grouped: Array<{ date: string; msgs: Message[] }> = [];
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toLocaleDateString("de-DE", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  }

  const inputBase: React.CSSProperties = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 150ms ease",
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--sidebar-bg)" }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <Icon icon="solar:chat-round-line-linear" style={{ color: "var(--border-strong)", width: 48, height: 48, marginBottom: 12 }} />
            <p className="font-medium text-sm" style={{ color: "var(--text-secondary)" }}>Noch keine Nachrichten</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>Starten Sie eine Konversation unten.</p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: "var(--input-bg)" }} />
              <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>{group.date}</span>
              <div className="flex-1 h-px" style={{ background: "var(--input-bg)" }} />
            </div>

            {group.msgs.map(msg => {
              const isOutbound = msg.direction === "outbound";
              const isEmail    = msg.channel === "email";
              const isSystem   = msg.channel === "system";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px" style={{ background: "var(--input-bg)" }} />
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}
                    >
                      <Icon icon="solar:info-circle-linear" style={{ color: "var(--text-secondary)", width: 12, height: 12, flexShrink: 0 }} />
                      <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{msg.content}</span>
                      <span className="text-[10px] ml-1 whitespace-nowrap" style={{ color: "var(--text-dim)" }}>{formatTime(msg.createdAt)}</span>
                    </div>
                    <div className="flex-1 h-px" style={{ background: "var(--input-bg)" }} />
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3`}>
                  {!isOutbound && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1"
                      style={{ background: "var(--border)" }}
                    >
                      <Icon
                        icon={isEmail ? "solar:letter-linear" : "solar:chat-round-line-linear"}
                        style={{ color: "var(--text-secondary)", width: 14, height: 14 }}
                      />
                    </div>
                  )}

                  <div className={`max-w-[75%] flex flex-col gap-1 ${isOutbound ? "items-end" : "items-start"}`}>
                    {/* Channel badge */}
                    <div className={`flex items-center gap-1 text-xs ${isOutbound ? "justify-end" : "justify-start"}`}>
                      {isEmail ? (
                        <span className="inline-flex items-center gap-1" style={{ color: "rgba(91,166,219,1)" }}>
                          <Icon icon="solar:letter-linear" style={{ width: 12, height: 12 }} /> E-Mail
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1" style={{ color: "rgba(34,197,94,1)" }}>
                          <Icon icon="solar:chat-round-line-linear" style={{ width: 12, height: 12 }} /> WhatsApp
                        </span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm"
                      style={{
                        background: isOutbound ? "#F2EAD3" : "var(--border)",
                        color: isOutbound ? "#000000" : "var(--text-primary)",
                        borderRadius: isOutbound ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      }}
                    >
                      {msg.subject && (
                        <div
                          className="text-xs font-semibold mb-1"
                          style={{ color: isOutbound ? "rgba(0,0,0,0.5)" : "var(--nav-text)" }}
                        >
                          Betreff: {msg.subject}
                        </div>
                      )}
                      {msg.content && (
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      )}
                      {msg.mediaUrl && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                          style={{ background: "var(--surface-hover)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--text-tertiary)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
                        >
                          <Icon icon="solar:document-text-linear" style={{ width: 14, height: 14 }} />
                          {msg.mediaName || "Anhang"}
                        </a>
                      )}
                    </div>

                    {/* Time & status */}
                    <div className={`flex items-center gap-2 text-xs ${isOutbound ? "flex-row-reverse" : ""}`} style={{ color: "var(--text-tertiary)" }}>
                      <span>{formatTime(msg.createdAt)}</span>
                      {isOutbound && msg.status && (
                        <span style={{
                          color: msg.status === "failed" ? "#EF4444" : msg.status === "read" ? "rgba(91,166,219,1)" : "var(--text-tertiary)",
                        }}>
                          {getStatusLabel(msg.status)}
                        </span>
                      )}
                    </div>
                  </div>

                  {isOutbound && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center ml-2 flex-shrink-0 self-end mb-1"
                      style={{ background: "rgba(242,234,211,0.15)" }}
                    >
                      <span className="text-xs font-bold" style={{ color: "#F2EAD3" }}>S</span>
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
      <div
        className="p-4"
        style={{ borderTop: "1px solid var(--sidebar-border)", background: "var(--surface)" }}
      >
        {/* Channel tabs */}
        <div
          className="flex p-0.5 mb-3 w-fit rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--surface-subtle)" }}
        >
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: activeTab === "whatsapp" ? "rgba(34,197,94,0.15)" : "transparent",
              color: activeTab === "whatsapp" ? "rgba(34,197,94,1)" : "var(--text-secondary)",
              transition: "all 150ms ease",
            }}
            onClick={() => setActiveTab("whatsapp")}
          >
            <Icon icon="solar:chat-round-line-linear" style={{ width: 14, height: 14 }} />
            WhatsApp
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: activeTab === "email" ? "rgba(27,119,186,0.15)" : "transparent",
              color: activeTab === "email" ? "rgba(91,166,219,1)" : "var(--text-secondary)",
              transition: "all 150ms ease",
            }}
            onClick={() => setActiveTab("email")}
          >
            <Icon icon="solar:letter-linear" style={{ width: 14, height: 14 }} />
            E-Mail
          </button>
        </div>

        {/* Email subject */}
        {activeTab === "email" && (
          <input
            type="text"
            placeholder="Betreff..."
            value={emailSubject}
            onChange={e => setEmailSubject(e.target.value)}
            className="w-full mb-2 px-3 py-2 text-sm"
            style={inputBase}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--input-border)"; }}
          />
        )}

        {/* Attached file chip */}
        {attachedFile && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 text-xs"
            style={{ background: "rgba(27,119,186,0.1)", border: "1px solid rgba(27,119,186,0.2)" }}
          >
            <Icon icon="solar:document-text-linear" style={{ color: "rgba(91,166,219,1)", width: 14, height: 14, flexShrink: 0 }} />
            <span className="truncate flex-1" style={{ color: "rgba(147,197,253,1)" }}>{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} style={{ color: "rgba(96,165,250,0.6)", flexShrink: 0 }}>
              <Icon icon="solar:close-circle-linear" style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-2"
            style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <Icon icon="solar:danger-triangle-linear" style={{ width: 14, height: 14, flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          className="hidden"
          onChange={e => setAttachedFile(e.target.files?.[0] ?? null)}
        />

        {/* Textarea + actions */}
        <div className="flex items-end gap-2">
          <textarea
            placeholder={activeTab === "whatsapp" ? "WhatsApp Nachricht..." : "E-Mail verfassen..."}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            rows={3}
            className="flex-1 px-3 py-2.5 text-sm resize-none"
            style={{ ...inputBase, borderRadius: "12px" }}
            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--input-border)"; }}
          />
          <div className="flex flex-col gap-1.5">
            {/* Attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Datei anhängen"
              className="p-2.5 rounded-xl flex-shrink-0 transition-all"
              style={{
                background: attachedFile ? "rgba(27,119,186,0.15)" : "var(--input-bg)",
                color: attachedFile ? "rgba(91,166,219,1)" : "var(--text-secondary)",
                transition: "all 150ms ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--border-strong)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = attachedFile ? "rgba(27,119,186,0.15)" : "var(--input-bg)"; }}
            >
              <Icon icon="solar:paperclip-linear" style={{ width: 16, height: 16 }} />
            </button>
            {/* Send */}
            <button
              onClick={sendMessage}
              disabled={sending || (!messageText.trim() && !attachedFile)}
              className="p-2.5 rounded-xl flex-shrink-0 transition-all"
              style={{
                background: activeTab === "whatsapp" ? "rgba(34,197,94,0.9)" : "rgba(27,119,186,0.9)",
                color: "var(--text-primary)",
                opacity: (sending || (!messageText.trim() && !attachedFile)) ? 0.4 : 1,
                transition: "all 150ms ease",
              }}
            >
              {sending
                ? <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--border-strong)", borderTopColor: "var(--text-primary)" }} />
                : <Icon icon="solar:arrow-up-linear" style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-dim)" }}>
          Enter zum Senden · Shift+Enter für neue Zeile
        </p>
      </div>
    </div>
  );
}
