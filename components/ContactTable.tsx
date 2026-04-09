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
  extraColumns?: string[];
}

type SortField = "name" | "email" | "company" | "createdAt";
type SortDir = "asc" | "desc";

export default function ContactTable({
  contacts,
  onDelete,
  extraColumns = [],
}: ContactTableProps) {
  const router = useRouter();
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
    let va = "";
    let vb = "";
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

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return (
        <ChevronUp className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
      );
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-500" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-500" />
    );
  }

  function getInitials(contact: Contact) {
    const first = contact.firstName?.charAt(0) || "";
    const last = contact.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
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

  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
  ];

  function getColor(id: string) {
    const idx = id.charCodeAt(0) % colors.length;
    return colors[idx];
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide group"
                onClick={() => toggleSort("name")}
              >
                Name <SortIcon field="name" />
              </button>
            </th>
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide group"
                onClick={() => toggleSort("email")}
              >
                E-Mail <SortIcon field="email" />
              </button>
            </th>
            <th className="text-left py-3 px-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Telefon
              </span>
            </th>
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide group"
                onClick={() => toggleSort("company")}
              >
                Unternehmen <SortIcon field="company" />
              </button>
            </th>
            {extraColumns.map((col) => (
              <th key={col} className="text-left py-3 px-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {col}
                </span>
              </th>
            ))}
            <th className="text-left py-3 px-4">
              <button
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide group"
                onClick={() => toggleSort("createdAt")}
              >
                Erstellt <SortIcon field="createdAt" />
              </button>
            </th>
            <th className="py-3 px-4 w-12" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((contact) => (
            <tr
              key={contact.id}
              className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getColor(contact.id)}`}
                  >
                    {getInitials(contact)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {[contact.firstName, contact.lastName]
                        .filter(Boolean)
                        .join(" ") || (
                        <span className="text-gray-400 italic">Kein Name</span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                {contact.email ? (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">
                      {contact.email}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                {contact.phone ? (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {contact.phone}
                  </div>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                {contact.company ? (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {contact.company}
                  </div>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              {extraColumns.map((col) => (
                <td key={col} className="py-3 px-4 text-gray-600">
                  {getCustomField(contact, col) || (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              ))}
              <td className="py-3 px-4 text-gray-400 text-xs">
                {new Date(contact.createdAt).toLocaleDateString("de-DE")}
              </td>
              <td
                className="py-3 px-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <button
                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === contact.id ? null : contact.id);
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openMenu === contact.id && (
                    <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[140px]">
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setOpenMenu(null);
                          router.push(`/contacts/${contact.id}`);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Bearbeiten
                      </button>
                      {onDelete && (
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setOpenMenu(null);
                            onDelete(contact.id);
                          }}
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
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Keine Kontakte gefunden</p>
          <p className="text-sm mt-1">
            Importieren Sie Kontakte oder legen Sie neue an.
          </p>
        </div>
      )}
    </div>
  );
}
