"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Icon } from "@iconify/react";
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#FFFFFF",
  padding: "10px 16px",
  fontSize: "14px",
  outline: "none",
  transition: "all 150ms ease",
};

const gradientBorderCard = {
  padding: "1px",
  borderRadius: "12px",
  background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 12px)",
  boxShadow: "rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.25) 0px 25px 50px -12px",
};

function ChannelIcon({ channel, size = 16 }: { channel: string; size?: number }) {
  if (channel === "whatsapp") return <Icon icon="solar:chat-round-line-linear" style={{ color: "#22C55E", width: size, height: size }} />;
  if (channel === "email") return <Icon icon="solar:letter-linear" style={{ color: "#3B82F6", width: size, height: size }} />;
  return <Icon icon="solar:users-group-rounded-linear" style={{ color: "rgba(167,139,250,1)", width: size, height: size }} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    draft:   { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" },
    sending: { bg: "rgba(251,191,36,0.1)", color: "rgba(251,191,36,1)" },
    sent:    { bg: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,1)" },
  };
  const labels: Record<string, string> = { draft: "Entwurf", sending: "Wird gesendet", sent: "Gesendet" };
  const s = styles[status] || styles.draft;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {status === "sent"    && <Icon icon="solar:check-circle-linear" style={{ width: 12, height: 12 }} />}
      {status === "sending" && <Icon icon="solar:clock-circle-linear" style={{ width: 12, height: 12 }} />}
      {status === "draft"   && <Icon icon="solar:pen-linear" style={{ width: 12, height: 12 }} />}
      {labels[status] || status}
    </span>
  );
}

function ChannelLabel({ channel }: { channel: string }) {
  const labels: Record<string, string> = { whatsapp: "WhatsApp", email: "E-Mail", both: "Beide Kanäle" };
  return <span>{labels[channel] || channel}</span>;
}

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
    <div className="min-h-full" style={{ background: "#111111" }}>
      <PageHeader
        title="Kampagnen"
        subtitle="Massen-Nachrichten per WhatsApp und E-Mail"
        actions={
          <button
            onClick={() => router.push("/campaigns/new")}
            className="flex items-center gap-2 font-semibold text-sm"
            style={{
              background: "#F2EAD3",
              color: "#000000",
              borderRadius: "9999px",
              padding: "8px 20px",
              border: "none",
              transition: "all 150ms ease",
            }}
          >
            <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
            Neue Kampagne
          </button>
        }
      />

      <div className="px-6 py-6 max-w-screen-xl">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { value: stats.total, label: "Kampagnen gesamt", color: "#FFFFFF" },
            { value: stats.sent, label: "Erfolgreich gesendet", color: "rgba(52,211,153,1)" },
            { value: stats.draft, label: "Entwürfe", color: "rgba(255,255,255,0.4)" },
            { value: stats.totalRecipients, label: "Empfänger gesamt", color: "#F2EAD3" },
          ].map((s, i) => (
            <div key={i} style={{ ...gradientBorderCard }}>
              <div style={{ borderRadius: "11px", background: "#1C1C1C", padding: "16px" }}>
                <div className="text-2xl font-bold" style={{ color: s.color, letterSpacing: "-0.025em" }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Campaign list */}
        {loading ? (
          <div
            className="rounded-2xl p-16 text-center"
            style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
          >
            Laden...
          </div>
        ) : campaigns.length === 0 ? (
          <div
            className="rounded-2xl p-16 text-center"
            style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Icon icon="solar:megaphone-linear" style={{ color: "rgba(255,255,255,0.15)", width: 48, height: 48, margin: "0 auto 12px" }} />
            <h2 className="font-semibold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Noch keine Kampagnen</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Erstellen Sie Ihre erste Kampagne, um Kontakte per WhatsApp oder E-Mail zu erreichen.</p>
            <button
              onClick={() => router.push("/campaigns/new")}
              className="inline-flex items-center gap-2 font-semibold text-sm"
              style={{
                background: "#F2EAD3",
                color: "#000000",
                borderRadius: "9999px",
                padding: "8px 20px",
                border: "none",
                transition: "all 150ms ease",
              }}
            >
              <Icon icon="solar:add-circle-linear" style={{ width: 16, height: 16 }} />
              Erste Kampagne erstellen
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <tr>
                  {["Kampagne", "Kanal", "Empfänger", "Status", "Erstellt"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ campaign, isFollowUp, isLast }) => {
                  const sentCount   = campaign.contacts.filter(c => c.status === "sent").length;
                  const failedCount = campaign.contacts.filter(c => c.status === "failed").length;
                  return (
                    <tr
                      key={campaign.id}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: isFollowUp ? "rgba(255,255,255,0.01)" : "transparent",
                        transition: "all 150ms ease",
                      }}
                      onClick={() => setSelectedCampaign(campaign)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isFollowUp ? "rgba(255,255,255,0.01)" : "transparent"; }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          {isFollowUp && (
                            <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: 20 }}>
                              <div className="w-px" style={{ background: "rgba(255,255,255,0.1)", height: isLast ? 10 : "100%" }} />
                              <div className="w-3 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isFollowUp && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0"
                                  style={{ background: "rgba(167,139,250,0.1)", color: "rgba(167,139,250,1)" }}
                                >
                                  <Icon icon="solar:branching-paths-linear" style={{ width: 10, height: 10 }} /> Folge
                                </span>
                              )}
                              <span className="font-medium truncate" style={{ color: "#FFFFFF" }}>{campaign.name}</span>
                              {campaign.followUps.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                                  style={{ background: "rgba(167,139,250,0.1)", color: "rgba(167,139,250,0.8)" }}
                                >
                                  <Icon icon="solar:branching-paths-linear" style={{ width: 10, height: 10 }} />{campaign.followUps.length}
                                </span>
                              )}
                            </div>
                            <div className="text-xs mt-0.5 line-clamp-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                              {campaign.template.slice(0, 60)}{campaign.template.length > 60 ? "…" : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                          <ChannelIcon channel={campaign.channel} />
                          <ChannelLabel channel={campaign.channel} />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div style={{ color: "rgba(255,255,255,0.7)" }}>{campaign.contacts.length} Empfänger</div>
                        {campaign.status === "sent" && (
                          <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {sentCount} gesendet{failedCount > 0 && <span style={{ color: "#EF4444" }}> · {failedCount} fehlgeschlagen</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={campaign.status} /></td>
                      <td className="py-3 px-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
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
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", opacity: visible ? 1 : 0 }}
        onClick={close}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-2xl max-h-[88vh] flex flex-col pointer-events-auto transition-all duration-300"
          style={{
            background: "#1C1C1C",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "rgba(0,0,0,0.4) 0px 25px 50px -12px",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
          }}
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
              <div
                className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div>
                  {campaign.parent && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold" style={{ color: "rgba(167,139,250,1)" }}>
                      <Icon icon="solar:branching-paths-linear" style={{ width: 12, height: 12 }} />
                      Folgekampagne zu „{campaign.parent.name}"
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <ChannelIcon channel={campaign.channel} />
                    <h2 className="text-lg" style={{ color: "#FFFFFF", fontWeight: 400, letterSpacing: "-0.025em" }}>{campaign.name}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={campaign.status} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <ChannelLabel channel={campaign.channel} /> · {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true, locale: de })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)", background: "transparent" }}
                >
                  <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Existing follow-ups */}
              {campaign.followUps.length > 0 && (
                <div
                  className="px-6 py-3 flex-shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(167,139,250,0.05)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "rgba(167,139,250,1)" }}>
                    <Icon icon="solar:branching-paths-linear" style={{ width: 12, height: 12 }} />
                    {campaign.followUps.length} Folgekampagne{campaign.followUps.length !== 1 ? "n" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.followUps.map(fu => (
                      <div
                        key={fu.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                        style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "rgba(255,255,255,0.7)" }}
                      >
                        <Icon icon="solar:arrow-right-linear" style={{ color: "rgba(167,139,250,0.7)", width: 12, height: 12 }} />
                        {fu.name}
                        <StatusBadge status={fu.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div
                className="grid grid-cols-3 gap-3 px-6 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                {[
                  { value: campaign.contacts.length, label: "Empfänger", bg: "rgba(255,255,255,0.04)", color: "#FFFFFF" },
                  { value: sentCount, label: "Gesendet", bg: "rgba(52,211,153,0.08)", color: "rgba(52,211,153,1)" },
                  failedCount > 0
                    ? { value: failedCount, label: "Fehlgeschlagen", bg: "rgba(239,68,68,0.08)", color: "#EF4444" }
                    : { value: pendingCount, label: "Ausstehend", bg: "rgba(251,191,36,0.08)", color: "rgba(251,191,36,1)" },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl p-3 text-center" style={{ background: s.bg }}>
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Template */}
              <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Nachrichtenvorlage</p>
                {campaign.subject && <p className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Betreff: {campaign.subject}</p>}
                <p
                  className="text-sm whitespace-pre-wrap rounded-xl px-4 py-3 leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}
                >
                  {campaign.template}
                </p>
              </div>

              {/* Recipients */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Empfänger</p>
                <div className="space-y-1">
                  {campaign.contacts.map(cc => {
                    const name = [cc.contact.firstName, cc.contact.lastName].filter(Boolean).join(" ") || "Unbekannt";
                    const sc = cc.status === "sent"
                      ? { bg: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,1)" }
                      : cc.status === "failed"
                        ? { bg: "rgba(239,68,68,0.1)", color: "#EF4444" }
                        : { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" };
                    const sl = cc.status === "sent" ? "Gesendet" : cc.status === "failed" ? "Fehler" : "Ausstehend";
                    return (
                      <div
                        key={cc.id}
                        className="flex items-center justify-between py-2 px-3 rounded-xl transition-colors"
                        style={{ transition: "all 150ms ease" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{name}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={sc}>{sl}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer: follow-up CTA */}
              <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => setShowFollowUp(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    border: "2px dashed rgba(167,139,250,0.3)",
                    color: "rgba(167,139,250,1)",
                    background: "transparent",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(167,139,250,0.6)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(167,139,250,0.3)"; }}
                >
                  <Icon icon="solar:branching-paths-linear" style={{ width: 16, height: 16 }} />
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
      <div
        className="flex items-center gap-3 px-6 pt-6 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ color: "rgba(255,255,255,0.4)", background: "transparent" }}
        >
          <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5" style={{ color: "rgba(167,139,250,1)" }}>
            <Icon icon="solar:branching-paths-linear" style={{ width: 12, height: 12 }} /> Folgekampagne zu „{parent.name}"
          </div>
          <h2 className="text-base" style={{ color: "#FFFFFF", fontWeight: 400 }}>Neue Folgekampagne</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Recipients preview */}
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(167,139,250,0.1)" }}>
            <Icon icon="solar:users-group-rounded-linear" style={{ color: "rgba(167,139,250,1)", width: 16, height: 16 }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "rgba(167,139,250,1)" }}>{contactIds.length} Empfänger übernommen</p>
            <p className="text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>Dieselben Kontakte wie in „{parent.name}"</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ChannelIcon channel={parent.channel} size={14} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}><ChannelLabel channel={parent.channel} /></span>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Name der Kampagne</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            placeholder="z.B. Folgekampagne – KFZ Angebot"
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
          />
        </div>

        {needsSubject && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>E-Mail Betreff</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={inputStyle}
              placeholder="z.B. Ihre Versicherungsanfrage – Nachfassung"
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            />
          </div>
        )}

        {/* Template */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Nachricht</label>
          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={6}
            placeholder={"Hallo {{vorname}},\n\nwir möchten uns nochmal bei Ihnen melden …"}
            style={{ ...inputStyle, resize: "none" }}
            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
          />
          <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Variablen: {"{{vorname}}"} {"{{nachname}}"} {"{{name}}"} {"{{email}}"} {"{{telefon}}"}</p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}
          >
            <Icon icon="solar:danger-triangle-linear" style={{ width: 16, height: 16, flexShrink: 0 }} />
            {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => submit(false)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-colors"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.6)",
            background: "transparent",
            opacity: saving ? 0.5 : 1,
            transition: "all 150ms ease",
          }}
        >
          {saving
            ? <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFFFFF" }} />
            : <Icon icon="solar:pen-linear" style={{ width: 16, height: 16 }} />}
          Als Entwurf speichern
        </button>
        <button
          onClick={() => submit(true)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition-colors"
          style={{
            background: "#F2EAD3",
            color: "#000000",
            opacity: saving ? 0.5 : 1,
            transition: "all 150ms ease",
          }}
        >
          {saving
            ? <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
            : <Icon icon="solar:send-linear" style={{ width: 16, height: 16 }} />}
          Sofort senden
        </button>
      </div>
    </div>
  );
}
