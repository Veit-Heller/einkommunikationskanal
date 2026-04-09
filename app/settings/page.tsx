"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
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
  const [connectingOutlook, setConnectingOutlook] = useState(false);
  const [outlookError, setOutlookError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params for OAuth callbacks
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "outlook") {
      // Refresh integrations
      loadIntegrations();
      window.history.replaceState({}, "", "/settings");
    }
    if (error) {
      setOutlookError(decodeURIComponent(error));
      window.history.replaceState({}, "", "/settings");
    }

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

  async function connectOutlook() {
    setConnectingOutlook(true);
    setOutlookError(null);
    try {
      const res = await fetch("/api/integrations/outlook");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }
      // Redirect to Microsoft OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      setOutlookError(
        err instanceof Error ? err.message : "Fehler beim Verbinden"
      );
      setConnectingOutlook(false);
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

  const outlookStatus = integrations.find((i) => i.type === "outlook");
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

      {/* Outlook Integration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-semibold text-gray-900">
                Microsoft Outlook
              </h2>
              {outlookStatus?.connected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Verbunden
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Nicht verbunden
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Verbinden Sie Ihr Outlook-Konto, um E-Mails direkt aus dem CRM zu
              senden und empfangene Nachrichten zu synchronisieren.
            </p>

            {outlookError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {outlookError}
              </div>
            )}

            {!outlookStatus?.connected ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Konfiguration erforderlich:</span>{" "}
                    Setzen Sie <code className="font-mono bg-amber-100 px-1 rounded">OUTLOOK_CLIENT_ID</code>{" "}
                    und <code className="font-mono bg-amber-100 px-1 rounded">OUTLOOK_CLIENT_SECRET</code>{" "}
                    in Ihrer <code className="font-mono bg-amber-100 px-1 rounded">.env.local</code>{" "}
                    Datei. Registrieren Sie dazu eine App im{" "}
                    <a
                      href="https://portal.azure.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Azure Portal
                    </a>
                    .
                  </p>
                </div>
                <button
                  onClick={connectOutlook}
                  disabled={connectingOutlook}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {connectingOutlook ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Mit Outlook verbinden
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex-1">
                  Outlook ist verbunden und bereit zum Senden von E-Mails.
                  {outlookStatus.expiresAt && (
                    <span className="text-green-600 block text-xs mt-0.5">
                      Token gültig bis:{" "}
                      {new Date(outlookStatus.expiresAt).toLocaleDateString(
                        "de-DE"
                      )}
                    </span>
                  )}
                </div>
                <button
                  onClick={connectOutlook}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Neu verbinden
                </button>
              </div>
            )}
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
