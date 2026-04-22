"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  createdAt: string;
  customFields: string | null;
}

interface ContactTableProps {
  contacts: Contact[];
  onDelete?: (id: string) => void;
  onContactClick?: (id: string) => void;
  extraColumns?: string[];
  viewMode?: "table" | "grid";
}

type SortField = "name" | "email" | "company" | "createdAt";
type SortDir = "asc" | "desc";

const AVATAR_BG_COLORS = [
  "rgba(139,92,246,0.15)",
  "rgba(27,119,186,0.15)",
  "rgba(132,204,22,0.15)",
  "rgba(249,115,22,0.15)",
  "rgba(236,72,153,0.15)",
  "rgba(20,184,166,0.15)",
];

const AVATAR_TEXT_COLORS = [
  "rgba(167,139,250,1)",
  "rgba(91,166,219,1)",
  "rgba(163,230,53,1)",
  "rgba(251,146,60,1)",
  "rgba(244,114,182,1)",
  "rgba(45,212,191,1)",
];

function getAvatarColors(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_BG_COLORS.length;
  return { bg: AVATAR_BG_COLORS[idx], text: AVATAR_TEXT_COLORS[idx] };
}

function getInitials(contact: Contact) {
  const f = contact.firstName?.charAt(0) || "";
  const l = contact.lastName?.charAt(0) || "";
  return (f + l).toUpperCase() || (contact.company?.charAt(0).toUpperCase() ?? "?");
}

function getFullName(contact: Contact) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || null;
}

function getCustomField(contact: Contact, col: string): string {
  if (!contact.customFields) return "";
  try {
    const parsed = JSON.parse(contact.customFields);
    return parsed[col] || "";
  } catch {
    return "";
  }
}

// ── Grid card view ────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onDelete,
  onClick,
}: {
  contact: Contact;
  onDelete?: (id: string) => void;
  onClick: (id: string) => void;
}) {
  const colors = getAvatarColors(contact.id);
  const initials = getInitials(contact);
  const name = getFullName(contact);

  return (
    <div
      onClick={() => onClick(contact.id)}
      className="relative cursor-pointer transition-all"
      style={{
        background: "#1C1C1C",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "20px",
        transition: "all 150ms ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.16)";
        (e.currentTarget as HTMLElement).style.background = "#222222";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.background = "#1C1C1C";
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: colors.bg, color: colors.text }}
        >
          {initials}
        </div>
        <Icon icon="solar:arrow-up-right-linear" style={{ color: "rgba(255,255,255,0.2)", width: 16, height: 16 }} />
      </div>

      {/* Name + company */}
      <h3 className="font-semibold text-sm leading-snug" style={{ color: name ? "#FFFFFF" : "rgba(255,255,255,0.25)" }}>
        {name ?? <span style={{ fontStyle: "italic", fontWeight: 400 }}>Kein Name</span>}
      </h3>
      {contact.company && (
        <p className="text-[12px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{contact.company}</p>
      )}

      {/* Channel tags */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {contact.phone && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: "rgba(34,197,94,1)" }}
          >
            <Icon icon="solar:chat-round-line-linear" style={{ width: 9, height: 9 }} />
            WhatsApp
          </span>
        )}
        {contact.email && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(27,119,186,0.1)", color: "rgba(91,166,219,1)" }}
          >
            <Icon icon="solar:letter-linear" style={{ width: 9, height: 9 }} />
            E-Mail
          </span>
        )}
      </div>

      {/* Date */}
      <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>
        {new Date(contact.createdAt).toLocaleDateString("de-DE")}
      </p>

      {/* Hover delete */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(contact.id);
          }}
          className="absolute top-3 right-10 p-1.5 rounded-lg transition-all"
          style={{
            opacity: 0,
            background: "transparent",
            color: "rgba(255,255,255,0.3)",
            transition: "all 150ms ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
            (e.currentTarget as HTMLElement).style.color = "#EF4444";
            (e.currentTarget as HTMLElement).style.opacity = "1";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)";
          }}
          title="Löschen"
        >
          <Icon icon="solar:trash-bin-trash-linear" style={{ width: 13, height: 13 }} />
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ContactTable({
  contacts,
  onDelete,
  onContactClick,
  extraColumns = [],
  viewMode = "table",
}: ContactTableProps) {
  const router = useRouter();
  const handleContactClick = (id: string) => onContactClick ? onContactClick(id) : router.push(`/contacts/${id}`);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = [...contacts].sort((a, b) => {
    let va = "", vb = "";
    if (sortField === "name") {
      va = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
      vb = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
    } else if (sortField === "email") {
      va = (a.email || "").toLowerCase();
      vb = (b.email || "").toLowerCase();
    } else if (sortField === "company") {
      va = (a.company || "").toLowerCase();
      vb = (b.company || "").toLowerCase();
    } else {
      va = a.createdAt;
      vb = b.createdAt;
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Grid view
  if (viewMode === "grid") {
    if (sorted.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Icon icon="solar:users-group-rounded-linear" style={{ color: "rgba(255,255,255,0.15)", width: 28, height: 28 }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Keine Kontakte gefunden</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Legen Sie einen neuen Kontakt an.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onDelete={onDelete}
            onClick={handleContactClick}
          />
        ))}
      </div>
    );
  }

  // Table view
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <Icon icon="solar:alt-arrow-up-linear" style={{ color: "rgba(255,255,255,0.2)", width: 12, height: 12 }} />;
    return sortDir === "asc"
      ? <Icon icon="solar:alt-arrow-up-linear" style={{ color: "#F2EAD3", width: 12, height: 12 }} />
      : <Icon icon="solar:alt-arrow-down-linear" style={{ color: "#F2EAD3", width: 12, height: 12 }} />;
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 16px",
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  };

  const thLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th style={thStyle}>
              <button
                className="flex items-center gap-1"
                style={thLabelStyle}
                onClick={() => toggleSort("name")}
              >
                Name <SortIcon field="name" />
              </button>
            </th>
            <th style={thStyle}>
              <button
                className="flex items-center gap-1"
                style={thLabelStyle}
                onClick={() => toggleSort("email")}
              >
                E-Mail <SortIcon field="email" />
              </button>
            </th>
            <th style={thStyle}>
              <span style={thLabelStyle}>Telefon</span>
            </th>
            <th style={thStyle}>
              <button
                className="flex items-center gap-1"
                style={thLabelStyle}
                onClick={() => toggleSort("company")}
              >
                Unternehmen <SortIcon field="company" />
              </button>
            </th>
            {extraColumns.map((col) => (
              <th key={col} style={thStyle}>
                <span style={thLabelStyle}>{col}</span>
              </th>
            ))}
            <th style={thStyle}>
              <button
                className="flex items-center gap-1"
                style={thLabelStyle}
                onClick={() => toggleSort("createdAt")}
              >
                Erstellt <SortIcon field="createdAt" />
              </button>
            </th>
            <th style={{ ...thStyle, width: 48 }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((contact) => {
            const colors = getAvatarColors(contact.id);
            const initials = getInitials(contact);
            const name = getFullName(contact);
            return (
              <tr
                key={contact.id}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onClick={() => handleContactClick(contact.id)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {initials}
                    </div>
                    <span
                      className="font-semibold"
                      style={{ color: name ? "#FFFFFF" : "rgba(255,255,255,0.25)", fontStyle: name ? "normal" : "italic" }}
                    >
                      {name ?? "Kein Name"}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  {contact.email ? (
                    <div className="flex items-center gap-1.5">
                      <Icon icon="solar:letter-linear" style={{ color: "rgba(255,255,255,0.25)", width: 14, height: 14, flexShrink: 0 }} />
                      <span className="truncate max-w-[200px] text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{contact.email}</span>
                    </div>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {contact.phone ? (
                    <div className="flex items-center gap-1.5">
                      <Icon icon="solar:phone-linear" style={{ color: "rgba(255,255,255,0.25)", width: 14, height: 14, flexShrink: 0 }} />
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{contact.phone}</span>
                    </div>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {contact.company ? (
                    <div className="flex items-center gap-1.5">
                      <Icon icon="solar:buildings-linear" style={{ color: "rgba(255,255,255,0.25)", width: 14, height: 14, flexShrink: 0 }} />
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{contact.company}</span>
                    </div>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                  )}
                </td>
                {extraColumns.map((col) => (
                  <td key={col} className="py-3.5 px-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {getCustomField(contact, col) || <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}
                  </td>
                ))}
                <td className="py-3.5 px-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {new Date(contact.createdAt).toLocaleDateString("de-DE")}
                </td>
                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      className="p-1.5 rounded-lg transition-all"
                      style={{
                        background: "transparent",
                        color: "rgba(255,255,255,0.25)",
                        transition: "all 150ms ease",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === contact.id ? null : contact.id);
                      }}
                    >
                      <Icon icon="solar:menu-dots-bold" style={{ width: 16, height: 16 }} />
                    </button>
                    {openMenu === contact.id && (
                      <div
                        className="absolute right-0 top-8 z-10 py-1"
                        style={{
                          background: "#1C1C1C",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "10px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                          minWidth: 148,
                        }}
                      >
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                          style={{ color: "rgba(255,255,255,0.7)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          onClick={() => { setOpenMenu(null); handleContactClick(contact.id); }}
                        >
                          <Icon icon="solar:pen-linear" style={{ color: "rgba(255,255,255,0.4)", width: 14, height: 14 }} />
                          Bearbeiten
                        </button>
                        {onDelete && (
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                            style={{ color: "#EF4444" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            onClick={() => { setOpenMenu(null); onDelete(contact.id); }}
                          >
                            <Icon icon="solar:trash-bin-trash-linear" style={{ width: 14, height: 14 }} />
                            Löschen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Icon icon="solar:users-group-rounded-linear" style={{ color: "rgba(255,255,255,0.15)", width: 28, height: 28 }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Keine Kontakte gefunden</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Importieren Sie Kontakte oder legen Sie neue an.</p>
        </div>
      )}
    </div>
  );
}
