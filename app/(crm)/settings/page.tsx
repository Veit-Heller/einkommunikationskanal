"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail, MessageCircle, CheckCircle2, AlertCircle,
  Save, Loader2, Info, Shield, User, ExternalLink, LogIn, RefreshCw,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface IntegrationStatus {
  id: string;
  type: string;
  connected: boolean;
  expiresAt?: string | null;
  config?: Record<string, string> | null;
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

// ── Status-Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <CheckCircle2 className="w-3 h-3" /> {label ?? "Verbunden"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
      <AlertCircle className="w-3 h-3" /> Nicht verbunden
    </span>
  );
}

// ── OAuth-Banner ───────────────────────────────────────────────────────────────
function OAuthBanner({ result, successMsg }: { result: string | null; successMsg: string }) {
  if (result === "success" || result === "success_partial") {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-4">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        {result === "success_partial"
          ? "Verbunden! Telefonnummer konnte nicht automatisch erkannt werden — bitte unten manuell eintragen."
          : successMsg}
      </div>
    );
  }
  if (result === "error") {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Verbindung fehlgeschlagen. Bitte prüfen Sie die Einstellungen und versuchen Sie es erneut.
      </div>
    );
  }
  return null;
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
function SettingsContent() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  const [profile, setProfile]             = useState({ name: "", role: "", company: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);

  // WhatsApp manuell (Fallback)
  const [waPhoneId,    setWaPhoneId]    = useState("");
  const [waToken,      setWaToken]      = useState("");
  const [waWebhook,    setWaWebhook]    = useState("");
  const [waWabaId,     setWaWabaId]     = useState("");
  const [savingWa,     setSavingWa]     = useState(false);
  const [waSaved,      setWaSaved]      = useState(false);
  const [waError,      setWaError]      = useState<string | null>(null);
  const [showWaManual, setShowWaManual] = useState(false);

  const outlookResult = searchParams.get("outlook");
  const googleResult  = searchParams.get("google");
  const metaResult    = searchParams.get("meta");

  useEffect(() => {
    loadIntegrations();
    fetch("/api/settings/profile")
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); })
      .catch(() => {});
  }, []);

  async function loadIntegrations() {
    try {
      const res  = await fetch("/api/integrations");
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

  async function saveWhatsAppManual() {
    setSavingWa(true);
    setWaError(null);
    setWaSaved(false);
    try {
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: waPhoneId,
          accessToken:   waToken,
          webhookVerifyToken: waWebhook,
          businessAccountId:  waWabaId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWaSaved(true);
      await loadIntegrations();
      setTimeout(() => setWaSaved(false), 4000);
    } catch (err) {
      setWaError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally { setSavingWa(false); }
  }

  const outlook   = integrations.find(i => i.type === "outlook");
  const google    = integrations.find(i => i.type === "google");
  const whatsapp  = integrations.find(i => i.type === "whatsapp");

  const outlookEmail    = outlook?.config?.email    ?? "";
  const googleEmail     = google?.config?.email     ?? "";
  const waPhoneDisplay  = whatsapp?.config?.phoneNumber ?? "";
  const waWabaName      = whatsapp?.config?.wabaName    ?? "";

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
                  <input
                    type="text" value={profile.name}
                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                    placeholder="z.B. Stevie Müller" className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Berufsbezeichnung</label>
                  <input
                    type="text" value={profile.role}
                    onChange={e => setProfile({ ...profile, role: e.target.value })}
                    placeholder="z.B. Versicherungsmakler, Finanzberater" className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Firmenname</label>
                  <input
                    type="text" value={profile.company}
                    onChange={e => setProfile({ ...profile, company: e.target.value })}
                    placeholder="z.B. Müller Versicherungen" className="input"
                  />
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

        {/* ── E-Mail-Anbieter: Outlook ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              {/* Microsoft Logo (SVG inline) */}
              <svg viewBox="0 0 21 21" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1"  width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-semibold text-slate-900">Outlook / Microsoft 365</h2>
                <StatusBadge connected={outlook?.connected ?? false} />
              </div>

              {outlook?.connected && outlookEmail && (
                <p className="text-sm text-slate-500 mb-3">
                  Verbunden als{" "}
                  <span className="font-medium text-slate-700">{outlookEmail}</span>
                  {outlook.expiresAt && (
                    <span className="text-slate-400">
                      {" "}· Token bis {new Date(outlook.expiresAt).toLocaleDateString("de-DE")} (auto-refresh)
                    </span>
                  )}
                </p>
              )}

              {!outlook?.connected && (
                <p className="text-sm text-slate-500 mb-4">
                  Mit Outlook verbinden, um E-Mails direkt über Ihren Microsoft-Account zu senden.
                </p>
              )}

              <OAuthBanner
                result={outlookResult}
                successMsg="Outlook erfolgreich verbunden! E-Mails können jetzt gesendet werden."
              />

              <a
                href="/api/integrations/outlook/auth"
                className="btn-primary inline-flex items-center gap-2"
              >
                {outlook?.connected
                  ? <><RefreshCw className="w-4 h-4" /> Erneut verbinden</>
                  : <><LogIn className="w-4 h-4" /> Mit Microsoft verbinden</>
                }
              </a>
            </div>
          </div>
        </div>

        {/* ── E-Mail-Anbieter: Gmail ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              {/* Gmail / Google Logo */}
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-semibold text-slate-900">Gmail / Google</h2>
                <StatusBadge connected={google?.connected ?? false} />
              </div>

              {google?.connected && googleEmail && (
                <p className="text-sm text-slate-500 mb-3">
                  Verbunden als{" "}
                  <span className="font-medium text-slate-700">{googleEmail}</span>
                  {google.expiresAt && (
                    <span className="text-slate-400">
                      {" "}· Token bis {new Date(google.expiresAt).toLocaleDateString("de-DE")} (auto-refresh)
                    </span>
                  )}
                </p>
              )}

              {!google?.connected && (
                <p className="text-sm text-slate-500 mb-4">
                  Alternativ zu Outlook: Gmail verbinden, um E-Mails über Google zu senden.
                  {(outlook?.connected) && (
                    <span className="text-slate-400"> (Optional — Outlook ist bereits aktiv)</span>
                  )}
                </p>
              )}

              <OAuthBanner
                result={googleResult}
                successMsg="Gmail erfolgreich verbunden! E-Mails können jetzt gesendet werden."
              />

              <a
                href="/api/integrations/google/auth"
                className="btn-primary inline-flex items-center gap-2"
              >
                {google?.connected
                  ? <><RefreshCw className="w-4 h-4" /> Erneut verbinden</>
                  : <><LogIn className="w-4 h-4" /> Mit Google verbinden</>
                }
              </a>
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
                <h2 className="font-semibold text-slate-900">WhatsApp Business</h2>
                <StatusBadge
                  connected={whatsapp?.connected ?? false}
                  label={whatsapp?.connected ? "Verbunden" : undefined}
                />
              </div>

              {whatsapp?.connected && (
                <p className="text-sm text-slate-500 mb-3">
                  {waPhoneDisplay && (
                    <>Nummer: <span className="font-medium text-slate-700">{waPhoneDisplay}</span>{" "}</>
                  )}
                  {waWabaName && (
                    <>· Account: <span className="font-medium text-slate-700">{waWabaName}</span></>
                  )}
                </p>
              )}

              {!whatsapp?.connected && (
                <p className="text-sm text-slate-500 mb-4">
                  Mit dem Meta Business Account verbinden — Telefonnummer und Token werden automatisch erkannt.
                </p>
              )}

              <OAuthBanner
                result={metaResult}
                successMsg="WhatsApp erfolgreich verbunden! Nachrichten können jetzt gesendet werden."
              />

              <div className="flex flex-wrap gap-3 items-center">
                <a
                  href="/api/integrations/meta/auth"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {whatsapp?.connected
                    ? <><RefreshCw className="w-4 h-4" /> Erneut verbinden</>
                    : <><LogIn className="w-4 h-4" /> Mit Meta verbinden</>
                  }
                </a>
                <button
                  type="button"
                  onClick={() => setShowWaManual(v => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  {showWaManual ? "Manuell ausblenden" : "Zugangsdaten manuell eingeben"}
                </button>
              </div>

              {/* Manuelles Formular (Fallback) */}
              {showWaManual && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    Zugangsdaten aus dem{" "}
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-flex items-center gap-0.5"
                    >
                      Meta Developer Dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                    {" "}→ WhatsApp → API Setup
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number ID *</label>
                    <input
                      type="text" value={waPhoneId}
                      onChange={e => setWaPhoneId(e.target.value)}
                      placeholder="123456789012345" className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Access Token *</label>
                    <input
                      type="password" value={waToken}
                      onChange={e => setWaToken(e.target.value)}
                      placeholder="EAAxxxxx…" className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Webhook Verify Token</label>
                    <input
                      type="text" value={waWebhook}
                      onChange={e => setWaWebhook(e.target.value)}
                      placeholder="mein-geheimer-token" className="input"
                    />
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Webhook-URL: https://ihre-domain.vercel.app/api/webhooks/whatsapp
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Business Account ID</label>
                    <input
                      type="text" value={waWabaId}
                      onChange={e => setWaWabaId(e.target.value)}
                      placeholder="123456789" className="input"
                    />
                  </div>

                  {waError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {waError}
                    </div>
                  )}
                  {waSaved && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      WhatsApp-Konfiguration gespeichert!
                    </div>
                  )}

                  <button
                    onClick={saveWhatsAppManual}
                    disabled={savingWa || !waPhoneId || !waToken}
                    className="btn-primary"
                  >
                    {savingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Speichern
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sicherheitshinweis ───────────────────────────────────────────── */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Shield className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Alle Zugangsdaten werden verschlüsselt in der Datenbank gespeichert.
            OAuth-Tokens werden automatisch erneuert. Änderungen greifen sofort ohne Neustart.
          </p>
        </div>
      </div>
    </div>
  );
}
