"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Info,
  Shield,
  Key,
} from "lucide-react";

interface IntegrationStatus {
  type: string;
  connected: boolean;
  expiresAt?: string;
}

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessAccountId: string;
}

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    phoneNumberId: "",
    accessToken: "",
    webhookVerifyToken: "",
    businessAccountId: "",
  });
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch {
      // ignore
    }
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
    } catch (err) {
      setWhatsappError(
        err instanceof Error ? err.message : "Fehler beim Speichern"
      );
    } finally {
      setSavingWhatsapp(false);
    }
  }

  const isGmailConfigured = integrations.find((i) => i.type === "gmail")?.connected ?? false;
  const whatsappStatus = integrations.find((i) => i.type === "whatsapp");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Verbinden Sie Ihre Kommunikationskanäle
        </p>
      </div>

      {/* Gmail Integration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-semibold text-gray-900">Gmail</h2>
              {isGmailConfigured ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Konfiguriert
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Nicht konfiguriert
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              E-Mails direkt aus dem CRM senden — über einfaches Gmail App-Passwort.
            </p>

            {gmailError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {gmailError}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Einrichtung (2 Minuten):</p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>myaccount.google.com → Sicherheit → 2-Faktor-Authentifizierung aktivieren</li>
                    <li>Dann → <strong>App-Passwörter</strong> → Neues App-Passwort → Name: "Stevies CRM"</li>
                    <li>16-stelliges Passwort kopieren</li>
                  </ol>
                  <p className="pt-1">Dann in <strong>Vercel → Environment Variables</strong> setzen:</p>
                  <div className="font-mono bg-blue-100 rounded px-2 py-1 space-y-0.5">
                    <div><span className="text-blue-600">EMAIL_USER</span> = deine-adresse@gmail.com</div>
                    <div><span className="text-blue-600">EMAIL_PASSWORD</span> = 16-stelliges App-Passwort</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Integration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-semibold text-gray-900">
                WhatsApp Cloud API
              </h2>
              {whatsappStatus?.connected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Konfiguriert
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Nicht konfiguriert
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Verbinden Sie die Meta WhatsApp Cloud API, um WhatsApp-Nachrichten
              zu senden und zu empfangen.
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Um WhatsApp zu nutzen, benötigen Sie ein Meta Business-Konto
                  und Zugang zur{" "}
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    WhatsApp Cloud API
                  </a>
                  . Die Zugangsdaten finden Sie im Meta Developer Dashboard.
                </p>
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
                Konfiguration gespeichert! Bitte aktualisieren Sie auch Ihre{" "}
                <code className="font-mono text-xs bg-green-100 px-1 rounded">
                  .env.local
                </code>{" "}
                Datei und starten Sie den Server neu.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Key className="w-3.5 h-3.5 inline mr-1" />
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  value={whatsappConfig.phoneNumberId}
                  onChange={(e) =>
                    setWhatsappConfig({
                      ...whatsappConfig,
                      phoneNumberId: e.target.value,
                    })
                  }
                  placeholder="123456789012345"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Key className="w-3.5 h-3.5 inline mr-1" />
                  Access Token *
                </label>
                <input
                  type="password"
                  value={whatsappConfig.accessToken}
                  onChange={(e) =>
                    setWhatsappConfig({
                      ...whatsappConfig,
                      accessToken: e.target.value,
                    })
                  }
                  placeholder="EAAxxxxx..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Webhook Verify Token
                </label>
                <input
                  type="text"
                  value={whatsappConfig.webhookVerifyToken}
                  onChange={(e) =>
                    setWhatsappConfig({
                      ...whatsappConfig,
                      webhookVerifyToken: e.target.value,
                    })
                  }
                  placeholder="mein-geheimer-token"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Webhook URL: <code className="font-mono text-xs">https://ihre-domain.de/api/webhooks/whatsapp</code>
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Business Account ID
                </label>
                <input
                  type="text"
                  value={whatsappConfig.businessAccountId}
                  onChange={(e) =>
                    setWhatsappConfig({
                      ...whatsappConfig,
                      businessAccountId: e.target.value,
                    })
                  }
                  placeholder="123456789"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                />
              </div>

              <button
                onClick={saveWhatsApp}
                disabled={
                  savingWhatsapp ||
                  !whatsappConfig.phoneNumberId ||
                  !whatsappConfig.accessToken
                }
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {savingWhatsapp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                WhatsApp konfigurieren
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">
          Alle Zugangsdaten werden verschlüsselt in der lokalen Datenbank
          gespeichert. Für den Produktionseinsatz sollten sensible Daten als
          Umgebungsvariablen in Ihrer{" "}
          <code className="font-mono text-xs">.env.local</code> Datei gesetzt
          werden.
        </p>
      </div>
    </div>
  );
}
