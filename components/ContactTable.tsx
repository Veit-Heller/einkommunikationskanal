"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Mail,
  Phone,
  Building2,
  MoreHorizontal,
  Trash2,
  Edit,
  Users,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";

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

const AVATAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-sky-100",    text: "text-sky-700" },
  { bg: "bg-lime-100",   text: "text-lime-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-pink-100",   text: "text-pink-700" },
  { bg: "bg-teal-100",   text: "text-teal-700" },
];

function getAvatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
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
  const color = getAvatarColor(contact.id);
  const initials = getInitials(contact);
  const name = getFullName(contact);

  return (
    <div
      onClick={() => onClick(contact.id)}
      className="group relative bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 cursor-pointer transition-all duration-200"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${color.bg} ${color.text}`}
        >
          {initials}
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
      </div>

      {/* Name + company */}
      <h3 className="font-semibold text-slate-900 text-sm leading-snug">
        {name ?? <span className="text-slate-300 italic font-normal">Kein Name</span>}
      </h3>
      {contact.company && (
        <p className="text-[12px] text-slate-400 mt-0.5 truncate">{contact.company}</p>
      )}

      {/* Channel tags */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {contact.phone && (
          <span className="badge bg-emerald-50 text-emerald-600">
            <MessageCircle size={9} />
            WhatsApp
          </span>
        )}
        {contact.email && (
          <span className="badge bg-sky-50 text-sky-600">
            <Mail size={9} />
            E-Mail
          </span>
        )}
      </div>

      {/* Date */}
      <p className="text-[11px] text-slate-300 mt-3">
        {new Date(contact.createdAt).toLocaleDateString("de-DE")}
      </p>

      {/* Hover delete */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(contact.id);
          }}
          className="absolute top-3 right-10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
          title="Löschen"
        >
          <Trash2 size={13} />
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
        <div className="text-center py-20 text-slate-300">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-slate-500">Keine Kontakte gefunden</p>
          <p className="text-sm mt-1 text-slate-400">Legen Sie einen neuen Kontakt an.</p>
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
      return <ChevronUp className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-lime-500" />
      : <ChevronDown className="w-3 h-3 text-lime-500" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider group"
                onClick={() => toggleSort("name")}
              >
                Name <SortIcon field="name" />
              </button>
            </th>
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider group"
                onClick={() => toggleSort("email")}
              >
                E-Mail <SortIcon field="email" />
              </button>
            </th>
            <th className="text-left py-3 px-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefon</span>
            </th>
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider group"
                onClick={() => toggleSort("company")}
              >
                Unternehmen <SortIcon field="company" />
              </button>
            </th>
            {extraColumns.map((col) => (
              <th key={col} className="text-left py-3 px-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{col}</span>
              </th>
            ))}
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider group"
                onClick={() => toggleSort("createdAt")}
              >
                Erstellt <SortIcon field="createdAt" />
              </button>
            </th>
            <th className="py-3 px-4 w-12" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((contact) => {
            const color = getAvatarColor(contact.id);
            const initials = getInitials(contact);
            const name = getFullName(contact);
            return (
              <tr
                key={contact.id}
                className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                onClick={() => handleContactClick(contact.id)}
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${color.bg} ${color.text}`}
                    >
                      {initials}
                    </div>
                    <span className={`font-semibold ${name ? "text-slate-800" : "text-slate-300 italic font-normal"}`}>
                      {name ?? "Kein Name"}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  {contact.email ? (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span className="truncate max-w-[200px] text-sm">{contact.email}</span>
                    </div>
                  ) : (
                    <span className="text-slate-200">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {contact.phone ? (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span className="text-sm">{contact.phone}</span>
                    </div>
                  ) : (
                    <span className="text-slate-200">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {contact.company ? (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span className="text-sm">{contact.company}</span>
                    </div>
                  ) : (
                    <span className="text-slate-200">—</span>
                  )}
                </td>
                {extraColumns.map((col) => (
                  <td key={col} className="py-3.5 px-4 text-slate-500 text-sm">
                    {getCustomField(contact, col) || <span className="text-slate-200">—</span>}
                  </td>
                ))}
                <td className="py-3.5 px-4 text-slate-400 text-xs">
                  {new Date(contact.createdAt).toLocaleDateString("de-DE")}
                </td>
                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === contact.id ? null : contact.id);
                      }}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenu === contact.id && (
                      <div className="absolute right-0 top-8 z-10 bg-white rounded-xl shadow-lg border border-slate-100 py-1 min-w-[148px]">
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => { setOpenMenu(null); handleContactClick(contact.id); }}
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-400" />
                          Bearbeiten
                        </button>
                        {onDelete && (
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            onClick={() => { setOpenMenu(null); onDelete(contact.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600">Keine Kontakte gefunden</p>
          <p className="text-sm mt-1 text-slate-400">Importieren Sie Kontakte oder legen Sie neue an.</p>
        </div>
      )}
    </div>
  );
}
