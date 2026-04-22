"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail, MessageCircle, CheckCircle2, AlertCircle,
  Save, Loader2, Info, Shield, Key, User, ExternalLink, LogIn,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface IntegrationStatus {
  id: string;
  type: string;
  connected: boolean;
  expiresAt?: string | null;
  config?: Record<string, string> | null;
}

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessAccountId: string;
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    phoneNumberId: "", accessToken: "", webhookVerifyToken: "", businessAccountId: "",
  });
  const [savingWhatsapp,  setSavingWhatsapp]  = useState(false);
  const [whatsappSaved,   setWhatsappSaved]   = useState(false);
  const [whatsappError,   setWhatsappError]   = useState<string | null>(null);

  const [profile, setProfile]           = useState({ name: "", role: "", company: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);

  // Outlook OAuth-Ergebnis aus URL-Params lesen
  const outlookResult = searchParams.get("outlook");

  useEffect(() => {
    loadIntegrations();
    fetch("/api/settings/profile")
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); })
      .catch(() => {});
  }, []);

  async function loadIntegrations() {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch { /* ignore */ }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } finally { setSavingProfile(false); }
  }

  async function saveWhatsApp() {
    setSavingWhatsapp(true);
    setWhatsappError(null);
    setWhatsappSaved(false);
    try {
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(whatsappConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWhatsappSaved(true);
      await loadIntegrations();
      setTimeout(() => setWhatsappSaved(false), 4000);
    } catch (err) {
      setWhatsappError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally { setSavingWhatsapp(false); }
  }

  const outlookStatus  = integrations.find(i => i.type === "outlook");
  const outlookEmail   = outlookStatus?.config?.email || "";
  const outlookConnected = outlookStatus?.connected ?? false;
  const whatsappStatus = integrations.find(i => i.type === "whatsapp");

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        title="Einstellungen"
        subtitle="Kommunikationskanäle verbinden & Profil konfigurieren"
      />

      <div className="px-6 max-w-2xl space-y-4 pb-10">

        {/* ── Profil ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-lime-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-lime-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900 mb-1">Mein Profil</h2>
              <p className="text-sm text-slate-500 mb-4">
                Name und Titel erscheinen in der Sidebar und im Kunden-Portal.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Vollständiger Name</label>
                  <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="z.B. Stevie Müller" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Berufsbezeichnung</label>
                  <input type="text" value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} placeholder="z.B. Versicherungsmakler, Finanzberater" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Firmenname</label>
                  <input type="text" value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })} placeholder="z.B. Müller Versicherungen" className="input" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={saveProfile} disabled={savingProfile} className="btn-primary">
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Profil speichern
                  </button>
                  {profileSaved && (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Gespeichert!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Outlook ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-semibold text-slate-900">Outlook / Microsoft 365</h2>
                {outlookConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Verbunden
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                    <AlertCircle className="w-3 h-3" /> Nicht verbunden
                  </span>
                )}
              </div>

              {outlookConnected && outlookEmail && (
                <p className="text-sm text-slate-500 mb-3">
                  Verbunden als <span className="font-medium text-slate-700">{outlookEmail}</span>
                </p>
              )}

              {!outlookConnected && (
                <p className="text-sm text-slate-500 mb-4">
                  Verbinden Sie Ihr Outlook-Konto, um E-Mails direkt aus dem CRM zu senden.
                </p>
              )}

              {/* OAuth-Ergebnis-Banner */}
              {outlookResult === "success" && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-4">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Outlook erfolgreich verbunden! E-Mails können jetzt gesendet werden.
                </div>
              )}
              {outlookResult === "error" && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Verbindung fehlgeschlagen. Bitte prüfen Sie die Vercel-Env-Vars und versuchen Sie es erneut.
                </div>
              )}

              {/* Voraussetzungen-Hinweis wenn nicht verbunden */}
              {!outlookConnected && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 space-y-1">
                      <p className="font-semibold">Voraussetzungen (einmalige Einrichtung):</p>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>
                          <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade" target="_blank" rel="noopener noreferrer" className="underline">
                            Azure App registrieren
                          </a>
                          {" "}→ "Accounts in any organizational directory and personal Microsoft accounts"
                        </li>
                        <li>Redirect URI hinzufügen: <code className="bg-blue-100 px-1 rounded font-mono">https://ihre-domain.vercel.app/api/integrations/outlook/callback</code></li>
                        <li>API-Berechtigungen: <code className="bg-blue-100 px-1 rounded font-mono">Mail.Send</code> + <code className="bg-blue-100 px-1 rounded font-mono">User.Read</code></li>
                        <li>Client Secret erstellen</li>
                      </ol>
                      <p className="pt-1">Dann in <strong>Vercel → Environment Variables</strong>:</p>
                      <div className="font-mono bg-blue-100 rounded px-2 py-1.5 space-y-0.5 text-[11px]">
                        <div><span className="text-blue-600">OUTLOOK_CLIENT_ID</span> = Application (client) ID</div>
                        <div><span className="text-blue-600">OUTLOOK_CLIENT_SECRET</span> = Client Secret Value</div>
                        <div><span className="text-blue-600">OUTLOOK_TENANT_ID</span> = common</div>
                        <div><span className="text-blue-600">OUTLOOK_REDIRECT_URI</span> = https://ihre-domain.vercel.app/api/integrations/outlook/callback</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <a
                  href="/api/integrations/outlook/auth"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {outlookConnected ? "Erneut verbinden" : "Mit Outlook verbinden"}
                </a>
                {outlookConnected && (
                  <span className="text-xs text-slate-400 self-center">
                    Token läuft ab: {outlookStatus?.expiresAt
                      ? new Date(outlookStatus.expiresAt).toLocaleDateString("de-DE")
                      : "unbekannt"} (wird automatisch erneuert)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── WhatsApp ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-semibold text-slate-900">WhatsApp Cloud API</h2>
                {whatsappStatus?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Konfiguriert
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                    <AlertCircle className="w-3 h-3" /> Nicht konfiguriert
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Verbinden Sie Ihren Meta Business Account für WhatsApp-Nachrichten.
              </p>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">Zugangsdaten finden im Meta Developer Dashboard:</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>
                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                          developers.facebook.com/apps <ExternalLink className="w-3 h-3" />
                        </a>
                        {" "}→ Ihre App → WhatsApp → API Setup
                      </li>
                      <li>Phone Number ID und temporären/permanenten Access Token kopieren</li>
                      <li>Webhook URL eintragen: <code className="bg-blue-100 px-1 rounded font-mono">https://ihre-domain.vercel.app/api/webhooks/whatsapp</code></li>
                    </ol>
                  </div>
                </div>
              </div>

              {whatsappError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {whatsappError}
                </div>
              )}
              {whatsappSaved && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-4">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  WhatsApp-Konfiguration gespeichert — bereit zum Senden!
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <Key className="w-3.5 h-3.5 inline mr-1" />Phone Number ID *
                  </label>
                  <input type="text" value={whatsappConfig.phoneNumberId}
                    onChange={e => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })}
                    placeholder="123456789012345" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <Key className="w-3.5 h-3.5 inline mr-1" />Access Token *
                  </label>
                  <input type="password" value={whatsappConfig.accessToken}
                    onChange={e => setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })}
                    placeholder="EAAxxxxx…" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Webhook Verify Token</label>
                  <input type="text" value={whatsappConfig.webhookVerifyToken}
                    onChange={e => setWhatsappConfig({ ...whatsappConfig, webhookVerifyToken: e.target.value })}
                    placeholder="mein-geheimer-token" className="input" />
                  <p className="text-xs text-slate-400 mt-1">
                    Webhook-URL: <code className="font-mono text-xs">https://ihre-domain.vercel.app/api/webhooks/whatsapp</code>
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Business Account ID</label>
                  <input type="text" value={whatsappConfig.businessAccountId}
                    onChange={e => setWhatsappConfig({ ...whatsappConfig, businessAccountId: e.target.value })}
                    placeholder="123456789" className="input" />
                </div>
                <button
                  onClick={saveWhatsApp}
                  disabled={savingWhatsapp || !whatsappConfig.phoneNumberId || !whatsappConfig.accessToken}
                  className="btn-primary"
                >
                  {savingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  WhatsApp speichern
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sicherheitshinweis ───────────────────────────────────────────── */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Shield className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Alle Zugangsdaten werden verschlüsselt in der Datenbank gespeichert. Outlook-Tokens
            werden automatisch erneuert. WhatsApp-Konfiguration greift sofort ohne Neustart.
          </p>
        </div>
      </div>
    </div>
  );
}
