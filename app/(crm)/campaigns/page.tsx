"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Megaphone, Mail, MessageCircle, Users,
  Clock, CheckCircle2, Edit3, Send, X,
  GitBranch, ChevronRight, Loader2, AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface FollowUpSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface Campaign {
  id: string;
  createdAt: string;
  name: string;
  channel: string;
  template: string;
  subject: string | null;
  status: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  followUps: FollowUpSummary[];
  contacts: Array<{
    id: string;
    status: string;
    contact: { id: string; firstName: string | null; lastName: string | null };
  }>;
}

function ChannelIcon({ channel, size = "w-4 h-4" }: { channel: string; size?: string }) {
  if (channel === "whatsapp") return <MessageCircle className={`${size} text-green-600`} />;
  if (channel === "email") return <Mail className={`${size} text-blue-600`} />;
  return <Users className={`${size} text-purple-600`} />;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft:   "bg-slate-100 text-slate-600",
    sending: "bg-amber-100 text-amber-700",
    sent:    "bg-emerald-100 text-emerald-700",
  };
  const labels: Record<string, string> = { draft: "Entwurf", sending: "Wird gesendet", sent: "Gesendet" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[status] || variants.draft}`}>
      {status === "sent"    && <CheckCircle2 className="w-3 h-3" />}
      {status === "sending" && <Clock className="w-3 h-3 animate-pulse" />}
      {status === "draft"   && <Edit3 className="w-3 h-3" />}
      {labels[status] || status}
    </span>
  );
}

function ChannelLabel({ channel }: { channel: string }) {
  const labels: Record<string, string> = { whatsapp: "WhatsApp", email: "E-Mail", both: "Beide Kanäle" };
  return <span>{labels[channel] || channel}</span>;
}

// Build a sorted, grouped list: parents first, their follow-ups nested right after
function groupCampaigns(campaigns: Campaign[]): Array<{ campaign: Campaign; isFollowUp: boolean; isLast: boolean }> {
  const parents  = campaigns.filter(c => !c.parentId);
  const byParent = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    if (c.parentId) {
      const arr = byParent.get(c.parentId) || [];
      arr.push(c);
      byParent.set(c.parentId, arr);
    }
  }

  const result: Array<{ campaign: Campaign; isFollowUp: boolean; isLast: boolean }> = [];
  for (const parent of parents) {
    result.push({ campaign: parent, isFollowUp: false, isLast: false });
    const children = byParent.get(parent.id) || [];
    children.forEach((child, i) => {
      result.push({ campaign: child, isFollowUp: true, isLast: i === children.length - 1 });
    });
  }
  // orphan follow-ups (parent deleted) at bottom
  for (const c of campaigns) {
    if (c.parentId && !parents.find(p => p.id === c.parentId)) {
      result.push({ campaign: c, isFollowUp: true, isLast: true });
    }
  }
  return result;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === "sent").length,
    draft: campaigns.filter(c => c.status === "draft").length,
    totalRecipients: campaigns.reduce((acc, c) => acc + c.contacts.length, 0),
  };

  const grouped = groupCampaigns(campaigns);

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kampagnen</h1>
            <p className="text-xs text-slate-400 mt-0.5">Massen-Nachrichten per WhatsApp und E-Mail</p>
          </div>
          <button onClick={() => router.push("/campaigns/new")} className="btn-primary">
            <Plus className="w-4 h-4" /> Neue Kampagne
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
            <div className="text-2xl font-bold text-lime-600">{stats.totalRecipients}</div>
            <div className="text-xs text-slate-500">Empfänger gesamt</div>
          </div>
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">Laden...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h2 className="font-semibold text-slate-700 mb-1">Noch keine Kampagnen</h2>
            <p className="text-sm text-slate-400 mb-6">Erstellen Sie Ihre erste Kampagne, um Kontakte per WhatsApp oder E-Mail zu erreichen.</p>
            <button onClick={() => router.push("/campaigns/new")} className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary">
              <Plus className="w-4 h-4" /> Erste Kampagne erstellen
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kampagne</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kanal</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empfänger</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ campaign, isFollowUp, isLast }) => {
                  const sentCount   = campaign.contacts.filter(c => c.status === "sent").length;
                  const failedCount = campaign.contacts.filter(c => c.status === "failed").length;
                  return (
                    <tr
                      key={campaign.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${isFollowUp ? "bg-slate-50/40" : ""}`}
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          {/* Visual connector for follow-ups */}
                          {isFollowUp && (
                            <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: 20 }}>
                              <div className={`w-px bg-slate-200 ${isLast ? "h-2.5" : "h-full"}`} />
                              <div className="w-3 h-px bg-slate-200" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isFollowUp && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-bold flex-shrink-0">
                                  <GitBranch className="w-2.5 h-2.5" /> Folge
                                </span>
                              )}
                              <span className="font-medium text-slate-900 truncate">{campaign.name}</span>
                              {campaign.followUps.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-500 rounded text-[10px] font-semibold flex-shrink-0">
                                  <GitBranch className="w-2.5 h-2.5" />{campaign.followUps.length}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {campaign.template.slice(0, 60)}{campaign.template.length > 60 ? "…" : ""}
                            </div>
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
                        <div className="text-slate-700">{campaign.contacts.length} Empfänger</div>
                        {campaign.status === "sent" && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {sentCount} gesendet{failedCount > 0 && <span className="text-red-400"> · {failedCount} fehlgeschlagen</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={campaign.status} /></td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true, locale: de })}
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
        <CampaignModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onFollowUpCreated={() => { load(); setSelectedCampaign(null); }}
        />
      )}
    </div>
  );
}

// ── Campaign detail modal ────────────────────────────────────────────────────

function CampaignModal({
  campaign, onClose, onFollowUpCreated,
}: {
  campaign: Campaign;
  onClose: () => void;
  onFollowUpCreated: () => void;
}) {
  const [visible, setVisible]         = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { if (showFollowUp) setShowFollowUp(false); else close(); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFollowUp]);

  function close() { setVisible(false); setTimeout(onClose, 250); }

  const sentCount    = campaign.contacts.filter(c => c.status === "sent").length;
  const failedCount  = campaign.contacts.filter(c => c.status === "failed").length;
  const pendingCount = campaign.contacts.filter(c => c.status === "pending").length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }} onClick={close} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col pointer-events-auto transition-all duration-300"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)" }}
        >
          {showFollowUp ? (
            <FollowUpForm
              parent={campaign}
              onBack={() => setShowFollowUp(false)}
              onCreated={onFollowUpCreated}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
                <div>
                  {campaign.parent && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-violet-500 font-semibold">
                      <GitBranch className="w-3 h-3" />
                      Folgekampagne zu „{campaign.parent.name}"
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <ChannelIcon channel={campaign.channel} />
                    <h2 className="text-lg font-bold text-slate-900">{campaign.name}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={campaign.status} />
                    <span className="text-xs text-slate-400">
                      <ChannelLabel channel={campaign.channel} /> · {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true, locale: de })}
                    </span>
                  </div>
                </div>
                <button onClick={close} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Existing follow-ups */}
              {campaign.followUps.length > 0 && (
                <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0 bg-violet-50/50">
                  <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" /> {campaign.followUps.length} Folgekampagne{campaign.followUps.length !== 1 ? "n" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.followUps.map(fu => (
                      <div key={fu.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-violet-100 rounded-full text-xs text-slate-600">
                        <ChevronRight className="w-3 h-3 text-violet-400" />
                        {fu.name}
                        <StatusBadge status={fu.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                {failedCount > 0
                  ? <div className="bg-red-50 rounded-2xl p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                      <div className="text-xs text-red-500">Fehlgeschlagen</div>
                    </div>
                  : <div className="bg-amber-50 rounded-2xl p-3 text-center">
                      <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
                      <div className="text-xs text-amber-500">Ausstehend</div>
                    </div>
                }
              </div>

              {/* Template */}
              <div className="px-6 py-4 flex-shrink-0 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nachrichtenvorlage</p>
                {campaign.subject && <p className="text-xs font-semibold text-slate-600 mb-1">Betreff: {campaign.subject}</p>}
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">
                  {campaign.template}
                </p>
              </div>

              {/* Recipients */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Empfänger</p>
                <div className="space-y-1">
                  {campaign.contacts.map(cc => {
                    const name = [cc.contact.firstName, cc.contact.lastName].filter(Boolean).join(" ") || "Unbekannt";
                    const sc = cc.status === "sent" ? "text-emerald-600 bg-emerald-50" : cc.status === "failed" ? "text-red-500 bg-red-50" : "text-slate-400 bg-slate-50";
                    const sl = cc.status === "sent" ? "Gesendet" : cc.status === "failed" ? "Fehler" : "Ausstehend";
                    return (
                      <div key={cc.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <span className="text-sm text-slate-700">{name}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sc}`}>{sl}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer: follow-up CTA */}
              <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                <button
                  onClick={() => setShowFollowUp(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-violet-200 text-violet-600 text-sm font-semibold hover:bg-violet-50 hover:border-violet-400 transition-all"
                >
                  <GitBranch className="w-4 h-4" />
                  Folgekampagne erstellen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Follow-up creation form ───────────────────────────────────────────────────

function FollowUpForm({
  parent, onBack, onCreated,
}: {
  parent: Campaign;
  onBack: () => void;
  onCreated: () => void;
}) {
  const contactIds = parent.contacts.map(c => c.contact.id);
  const [name, setName]         = useState(`Folgekampagne – ${parent.name}`);
  const [template, setTemplate] = useState("");
  const [subject, setSubject]   = useState(parent.subject || "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const needsSubject = parent.channel === "email" || parent.channel === "both";

  async function submit(send: boolean) {
    if (!name.trim() || !template.trim()) { setError("Name und Nachricht sind erforderlich."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, channel: parent.channel, template, subject: subject || null, contactIds, send, parentId: parent.id }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Fehler"); return; }
      onCreated();
    } catch { setError("Netzwerkfehler."); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col h-full max-h-[88vh]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-violet-500 font-semibold mb-0.5">
            <GitBranch className="w-3 h-3" /> Folgekampagne zu „{parent.name}"
          </div>
          <h2 className="text-base font-bold text-slate-900">Neue Folgekampagne</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Recipients preview */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-800">{contactIds.length} Empfänger übernommen</p>
            <p className="text-xs text-violet-500">Dieselben Kontakte wie in „{parent.name}"</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ChannelIcon channel={parent.channel} size="w-3.5 h-3.5" />
            <span className="text-xs text-slate-500"><ChannelLabel channel={parent.channel} /></span>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Name der Kampagne</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input w-full"
            placeholder="z.B. Folgekampagne – KFZ Angebot"
          />
        </div>

        {/* Subject (if email) */}
        {needsSubject && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">E-Mail Betreff</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="input w-full"
              placeholder="z.B. Ihre Versicherungsanfrage – Nachfassung"
            />
          </div>
        )}

        {/* Template */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nachricht</label>
          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={6}
            placeholder={"Hallo {{vorname}},\n\nwir möchten uns nochmal bei Ihnen melden …"}
            className="input w-full resize-none"
          />
          <p className="text-[11px] text-slate-400 mt-1">Variablen: {"{{vorname}}"} {"{{nachname}}"} {"{{name}}"} {"{{email}}"} {"{{telefon}}"}</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
        <button
          onClick={() => submit(false)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
          Als Entwurf speichern
        </button>
        <button
          onClick={() => submit(true)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-lime-500 rounded-2xl text-sm font-bold text-white hover:bg-lime-600 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Sofort senden
        </button>
      </div>
    </div>
  );
}
