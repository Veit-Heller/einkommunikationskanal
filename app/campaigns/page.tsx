"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Megaphone, Mail, MessageCircle, Users,
  Clock, CheckCircle2, Edit3, Send, X,
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
    draft: "bg-slate-100 text-slate-600",
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
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

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
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kampagnen</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Massen-Nachrichten per WhatsApp und E-Mail
            </p>
          </div>
          <button
            onClick={() => router.push("/campaigns/new")}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Neue Kampagne
          </button>
        </div>
      </div>

      <div className="px-6 max-w-screen-xl">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-400">Kampagnen gesamt</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">{stats.sent}</div>
          <div className="text-xs text-slate-400">Erfolgreich gesendet</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-400">{stats.draft}</div>
          <div className="text-xs text-slate-400">Entwürfe</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-2xl font-bold text-lime-600">
            {stats.totalRecipients}
          </div>
          <div className="text-xs text-slate-500">Empfänger gesamt</div>
        </div>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          Laden...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-700 mb-1">
            Noch keine Kampagnen
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Erstellen Sie Ihre erste Kampagne, um Kontakte per WhatsApp oder
            E-Mail zu erreichen.
          </p>
          <button
            onClick={() => router.push("/campaigns/new")}
            className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary"
          >
            <Plus className="w-4 h-4" />
            Erste Kampagne erstellen
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Kampagne
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Kanal
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Empfänger
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {campaign.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {campaign.template.slice(0, 60)}
                          {campaign.template.length > 60 ? "..." : ""}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <ChannelIcon channel={campaign.channel} />
                        <ChannelLabel channel={campaign.channel} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700">
                        {campaign.contacts.length} Empfänger
                      </div>
                      {campaign.status === "sent" && (
                        <div className="text-xs text-slate-400 mt-0.5">
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
                    <td className="py-3 px-4 text-slate-400 text-xs">
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

      {selectedCampaign && (
        <CampaignModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
      )}
    </div>
  );
}

// ── Campaign detail modal ────────────────────────────────────────────────────

function CampaignModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  const sentCount   = campaign.contacts.filter(c => c.status === "sent").length;
  const failedCount = campaign.contacts.filter(c => c.status === "failed").length;
  const pendingCount = campaign.contacts.filter(c => c.status === "pending").length;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/25 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={close}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto transition-all duration-250"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ChannelIcon channel={campaign.channel} />
                <h2 className="text-lg font-bold text-slate-900">{campaign.name}</h2>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={campaign.status} />
                <span className="text-xs text-slate-400">
                  <ChannelLabel channel={campaign.channel} /> ·{" "}
                  {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true, locale: de })}
                </span>
              </div>
            </div>
            <button onClick={close} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 px-6 py-4 flex-shrink-0 border-b border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{campaign.contacts.length}</div>
              <div className="text-xs text-slate-400">Empfänger</div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold text-emerald-700">{sentCount}</div>
              <div className="text-xs text-emerald-600">Gesendet</div>
            </div>
            {failedCount > 0 ? (
              <div className="bg-red-50 rounded-2xl p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-xs text-red-500">Fehlgeschlagen</div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-2xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
                <div className="text-xs text-amber-500">Ausstehend</div>
              </div>
            )}
          </div>

          {/* Template */}
          <div className="px-6 py-4 flex-shrink-0 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nachrichtenvorlage</p>
            {campaign.subject && (
              <p className="text-xs font-semibold text-slate-600 mb-1">Betreff: {campaign.subject}</p>
            )}
            <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">
              {campaign.template}
            </p>
          </div>

          {/* Recipients */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Empfänger</p>
            <div className="space-y-1.5">
              {campaign.contacts.map(cc => {
                const name = [cc.contact.firstName, cc.contact.lastName].filter(Boolean).join(" ") || "Unbekannt";
                const statusColor = cc.status === "sent" ? "text-emerald-600 bg-emerald-50" : cc.status === "failed" ? "text-red-500 bg-red-50" : "text-slate-400 bg-slate-50";
                const statusLabel = cc.status === "sent" ? "Gesendet" : cc.status === "failed" ? "Fehler" : "Ausstehend";
                return (
                  <div key={cc.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-sm text-slate-700">{name}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
