"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Megaphone,
  Mail,
  MessageCircle,
  Users,
  Clock,
  CheckCircle2,
  Edit3,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Campaign {
  id: string;
  createdAt: string;
  name: string;
  channel: string;
  template: string;
  subject: string | null;
  status: string;
  contacts: Array<{
    id: string;
    status: string;
    contact: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
  }>;
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "whatsapp")
    return <MessageCircle className="w-4 h-4 text-green-600" />;
  if (channel === "email") return <Mail className="w-4 h-4 text-blue-600" />;
  return <Users className="w-4 h-4 text-purple-600" />;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sending: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    draft: "Entwurf",
    sending: "Wird gesendet",
    sent: "Gesendet",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[status] || variants.draft}`}
    >
      {status === "sent" && <CheckCircle2 className="w-3 h-3" />}
      {status === "sending" && <Clock className="w-3 h-3 animate-pulse" />}
      {status === "draft" && <Edit3 className="w-3 h-3" />}
      {labels[status] || status}
    </span>
  );
}

function ChannelLabel({ channel }: { channel: string }) {
  const labels: Record<string, string> = {
    whatsapp: "WhatsApp",
    email: "E-Mail",
    both: "Beide Kanäle",
  };
  return <span>{labels[channel] || channel}</span>;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter((c) => c.status === "sent").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    totalRecipients: campaigns.reduce((acc, c) => acc + c.contacts.length, 0),
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kampagnen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Massen-Nachrichten per WhatsApp und E-Mail
          </p>
        </div>
        <button
          onClick={() => router.push("/campaigns/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Kampagne
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Kampagnen gesamt</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          <div className="text-xs text-gray-500">Erfolgreich gesendet</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-400">{stats.draft}</div>
          <div className="text-xs text-gray-500">Entwürfe</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalRecipients}
          </div>
          <div className="text-xs text-gray-500">Empfänger gesamt</div>
        </div>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
          Laden...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-700 mb-1">
            Noch keine Kampagnen
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Erstellen Sie Ihre erste Kampagne, um Kontakte per WhatsApp oder
            E-Mail zu erreichen.
          </p>
          <button
            onClick={() => router.push("/campaigns/new")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Erste Kampagne erstellen
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Kampagne
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Kanal
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Empfänger
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Erstellt
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const sentCount = campaign.contacts.filter(
                  (c) => c.status === "sent"
                ).length;
                const failedCount = campaign.contacts.filter(
                  (c) => c.status === "failed"
                ).length;

                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {campaign.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {campaign.template.slice(0, 60)}
                          {campaign.template.length > 60 ? "..." : ""}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <ChannelIcon channel={campaign.channel} />
                        <ChannelLabel channel={campaign.channel} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-700">
                        {campaign.contacts.length} Empfänger
                      </div>
                      {campaign.status === "sent" && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {sentCount} gesendet
                          {failedCount > 0 && (
                            <span className="text-red-400">
                              {" "}
                              · {failedCount} fehlgeschlagen
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(campaign.createdAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
