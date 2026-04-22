"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
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

// ── Gradient Border Shell ──────────────────────────────────────────────────────
function GradientCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      style={{
        padding: "1px",
        borderRadius: "12px",
        background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 12px)",
        boxShadow: "rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.1) 0px 8px 10px -6px, rgba(0,0,0,0.25) 0px 25px 50px -12px",
      }}
      className={className}
    >
      <div
        style={{ borderRadius: "11px", background: "#1C1C1C" }}
        className="p-6"
      >
        {children}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
      style={{ background: "rgba(242,234,211,0.15)", color: "#F2EAD3", border: "1px solid rgba(242,234,211,0.3)" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#F2EAD3]" />
      Verbunden
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
      Nicht verbunden
    </span>
  );
}

// ── OAuth Banner ───────────────────────────────────────────────────────────────
function OAuthBanner({ result, successMsg }: { result: string | null; successMsg: string }) {
  if (result === "success" || result === "success_partial") {
    return (
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm mb-4 transition-all duration-150"
        style={{ background: "rgba(242,234,211,0.1)", border: "1px solid rgba(242,234,211,0.2)", color: "#F2EAD3" }}>
        <Icon icon="solar:check-circle-linear" className="w-4 h-4 flex-shrink-0" />
        {result === "success_partial"
          ? "Verbunden! Telefonnummer konnte nicht automatisch erkannt werden — bitte unten manuell eintragen."
          : successMsg}
      </div>
    );
  }
  if (result === "error") {
    return (
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm mb-4 transition-all duration-150"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
        <Icon icon="solar:danger-triangle-linear" className="w-4 h-4 flex-shrink-0" />
        Verbindung fehlgeschlagen. Bitte versuche es erneut.
      </div>
    );
  }
  return null;
}

// ── Primary Button (Cream) ─────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled, href }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
}) {
  const cls = "inline-flex items-center gap-2 px-5 py-2 text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const style = {
    borderRadius: "9999px",
    background: "#F2EAD3",
    color: "#000000",
    border: "none",
  };
  if (href) return (
    <a href={href} className={cls} style={style}>{children}</a>
  );
  return (
    <button onClick={onClick} disabled={disabled} className={cls} style={style}>{children}</button>
  );
}

// ── Secondary Button (Blue) ────────────────────────────────────────────────────
function SecondaryBtn({ children, onClick, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-8 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        borderRadius: "9999px",
        background: "#1B77BA",
        border: "1px solid rgba(27,119,186,0.5)",
      }}
    >
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────────
function DarkInput({ value, onChange, placeholder, type = "text" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 text-sm transition-all duration-150 outline-none placeholder:opacity-30"
      style={{
        borderRadius: "8px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#FFFFFF",
      }}
    />
  );
}

// ── Label ──────────────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>
      {children}
    </label>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
function SettingsContent() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  const [profile, setProfile]             = useState({ name: "", role: "", company: "", logoUrl: "", avatarUrl: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const logoInputRef   = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [waPhoneId, setWaPhoneId]   = useState("");
  const [waToken,   setWaToken]     = useState("");
  const [waWebhook, setWaWebhook]   = useState("");
  const [waWabaId,  setWaWabaId]    = useState("");
  const [savingWa,  setSavingWa]    = useState(false);
  const [waSaved,   setWaSaved]     = useState(false);
  const [waError,   setWaError]     = useState<string | null>(null);
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const logoUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl }),
      });
      if (res.ok) setProfile(prev => ({ ...prev, logoUrl }));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    await fetch("/api/settings/logo", { method: "DELETE" });
    setProfile(prev => ({ ...prev, logoUrl: "" }));
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const avatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      if (res.ok) setProfile(prev => ({ ...prev, avatarUrl }));
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    await fetch("/api/settings/avatar", { method: "DELETE" });
    setProfile(prev => ({ ...prev, avatarUrl: "" }));
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
          accessToken: waToken,
          webhookVerifyToken: waWebhook,
          businessAccountId: waWabaId,
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

  const outlook  = integrations.find(i => i.type === "outlook");
  const google   = integrations.find(i => i.type === "google");
  const whatsapp = integrations.find(i => i.type === "whatsapp");

  const outlookEmail   = outlook?.config?.email    ?? "";
  const googleEmail    = google?.config?.email     ?? "";
  const waPhoneDisplay = whatsapp?.config?.phoneNumber ?? "";

  return (
    <div className="min-h-full" style={{ background: "#111111" }}>
      <PageHeader
        title="Einstellungen"
        subtitle="Kommunikationskanäle verbinden & Profil konfigurieren"
      />

      <div className="px-6 pt-6 max-w-2xl space-y-4 pb-10">

        {/* ── Profil ──────────────────────────────────────────────────────── */}
        <GradientCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(242,234,211,0.1)", border: "1px solid rgba(242,234,211,0.2)" }}>
              <Icon icon="solar:user-linear" className="w-5 h-5" style={{ color: "#F2EAD3" }} />
            </div>
            <div className="flex-1">
              <h2 className="font-normal mb-1" style={{ color: "#FFFFFF", fontSize: "18px", letterSpacing: "-0.025em" }}>
                Mein Profil
              </h2>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Name und Titel erscheinen in der Sidebar und im Kunden-Portal.
              </p>
              <div className="space-y-3">
                {/* Logo Upload */}
                <div>
                  <FieldLabel>Firmen-Logo</FieldLabel>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      {profile.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Icon icon="solar:bolt-linear" style={{ color: "rgba(255,255,255,0.25)", width: 24, height: 24 }} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm transition-all duration-150"
                        style={{ borderRadius: 9999, background: "#F2EAD3", color: "#000", fontWeight: 400, opacity: uploadingLogo ? 0.5 : 1 }}
                      >
                        {uploadingLogo
                          ? <Icon icon="solar:refresh-linear" className="w-4 h-4 animate-spin" />
                          : <Icon icon="solar:upload-minimalistic-linear" className="w-4 h-4" />
                        }
                        {uploadingLogo ? "Lädt..." : "Logo hochladen"}
                      </button>
                      {profile.logoUrl && (
                        <button
                          onClick={removeLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-150"
                          style={{ borderRadius: 9999, background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                          <Icon icon="solar:trash-bin-linear" className="w-4 h-4" />
                          Entfernen
                        </button>
                      )}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>PNG, JPG oder SVG · max. 300 KB · erscheint oben in der Sidebar</p>
                </div>

                {/* Avatar Upload */}
                <div>
                  <FieldLabel>Profilbild</FieldLabel>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden text-base font-bold"
                      style={{ background: profile.avatarUrl ? "transparent" : "#F2EAD3", color: "#000" }}
                    >
                      {profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (profile.name || "M").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm transition-all duration-150"
                        style={{ borderRadius: 9999, background: "#F2EAD3", color: "#000", fontWeight: 400, opacity: uploadingAvatar ? 0.5 : 1 }}
                      >
                        {uploadingAvatar
                          ? <Icon icon="solar:refresh-linear" className="w-4 h-4 animate-spin" />
                          : <Icon icon="solar:upload-minimalistic-linear" className="w-4 h-4" />
                        }
                        {uploadingAvatar ? "Lädt..." : "Bild hochladen"}
                      </button>
                      {profile.avatarUrl && (
                        <button
                          onClick={removeAvatar}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-150"
                          style={{ borderRadius: 9999, background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                          <Icon icon="solar:trash-bin-linear" className="w-4 h-4" />
                          Entfernen
                        </button>
                      )}
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>Erscheint unten in der Sidebar · max. 300 KB</p>
                </div>

                <div>
                  <FieldLabel>Vollständiger Name</FieldLabel>
                  <DarkInput value={profile.name} onChange={v => setProfile({ ...profile, name: v })} placeholder="z.B. Stevie Müller" />
                </div>
                <div>
                  <FieldLabel>Berufsbezeichnung</FieldLabel>
                  <DarkInput value={profile.role} onChange={v => setProfile({ ...profile, role: v })} placeholder="z.B. Versicherungsmakler" />
                </div>
                <div>
                  <FieldLabel>Firmenname</FieldLabel>
                  <DarkInput value={profile.company} onChange={v => setProfile({ ...profile, company: v })} placeholder="z.B. Müller Versicherungen" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <PrimaryBtn onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile
                      ? <Icon icon="solar:refresh-linear" className="w-4 h-4 animate-spin" />
                      : <Icon icon="solar:diskette-linear" className="w-4 h-4" />
                    }
                    Profil speichern
                  </PrimaryBtn>
                  {profileSaved && (
                    <span className="flex items-center gap-1.5 text-sm transition-all duration-150" style={{ color: "#F2EAD3" }}>
                      <Icon icon="solar:check-circle-linear" className="w-4 h-4" />
                      Gespeichert!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </GradientCard>

        {/* ── Outlook ─────────────────────────────────────────────────────── */}
        <GradientCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(27,119,186,0.1)", border: "1px solid rgba(27,119,186,0.2)" }}>
              <svg viewBox="0 0 21 21" className="w-5 h-5">
                <rect x="1" y="1"  width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-normal" style={{ color: "#FFFFFF", fontSize: "18px", letterSpacing: "-0.025em" }}>
                  Outlook / Microsoft 365
                </h2>
                <StatusBadge connected={outlook?.connected ?? false} />
              </div>

              {outlook?.connected && outlookEmail && (
                <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Verbunden als{" "}
                  <span style={{ color: "#F2EAD3" }}>{outlookEmail}</span>
                </p>
              )}
              {!outlook?.connected && (
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Mit Outlook verbinden, um E-Mails direkt über deinen Microsoft-Account zu senden.
                </p>
              )}

              <OAuthBanner result={outlookResult} successMsg="Outlook erfolgreich verbunden!" />

              <a href="/api/integrations/outlook/auth"
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium transition-all duration-150"
                style={{ borderRadius: "9999px", background: "#F2EAD3", color: "#000000" }}>
                <Icon icon={outlook?.connected ? "solar:refresh-linear" : "solar:login-linear"} className="w-4 h-4" />
                {outlook?.connected ? "Erneut verbinden" : "Mit Microsoft verbinden"}
              </a>
            </div>
          </div>
        </GradientCard>

        {/* ── Gmail ───────────────────────────────────────────────────────── */}
        <GradientCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-normal" style={{ color: "#FFFFFF", fontSize: "18px", letterSpacing: "-0.025em" }}>
                  Gmail / Google
                </h2>
                <StatusBadge connected={google?.connected ?? false} />
              </div>

              {google?.connected && googleEmail && (
                <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Verbunden als <span style={{ color: "#F2EAD3" }}>{googleEmail}</span>
                </p>
              )}
              {!google?.connected && (
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Alternativ zu Outlook: Gmail verbinden.
                  {outlook?.connected && <span style={{ color: "rgba(255,255,255,0.25)" }}> (Optional — Outlook ist bereits aktiv)</span>}
                </p>
              )}

              <OAuthBanner result={googleResult} successMsg="Gmail erfolgreich verbunden!" />

              <a href="/api/integrations/google/auth"
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium transition-all duration-150"
                style={{ borderRadius: "9999px", background: "#F2EAD3", color: "#000000" }}>
                <Icon icon={google?.connected ? "solar:refresh-linear" : "solar:login-linear"} className="w-4 h-4" />
                {google?.connected ? "Erneut verbinden" : "Mit Google verbinden"}
              </a>
            </div>
          </div>
        </GradientCard>

        {/* ── WhatsApp ────────────────────────────────────────────────────── */}
        <GradientCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(242,234,211,0.1)", border: "1px solid rgba(242,234,211,0.2)" }}>
              <Icon icon="solar:chat-round-dots-linear" className="w-5 h-5" style={{ color: "#F2EAD3" }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-normal" style={{ color: "#FFFFFF", fontSize: "18px", letterSpacing: "-0.025em" }}>
                  WhatsApp Business
                </h2>
                <StatusBadge connected={whatsapp?.connected ?? false} />
              </div>

              {whatsapp?.connected && waPhoneDisplay && (
                <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Nummer: <span style={{ color: "#F2EAD3" }}>{waPhoneDisplay}</span>
                </p>
              )}
              {!whatsapp?.connected && (
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Mit Meta verbinden — Telefonnummer wird automatisch erkannt.
                </p>
              )}

              <OAuthBanner result={metaResult} successMsg="WhatsApp erfolgreich verbunden!" />

              <div className="flex flex-wrap gap-3 items-center">
                <a href="/api/integrations/meta/auth"
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium transition-all duration-150"
                  style={{ borderRadius: "9999px", background: "#F2EAD3", color: "#000000" }}>
                  <Icon icon={whatsapp?.connected ? "solar:refresh-linear" : "solar:login-linear"} className="w-4 h-4" />
                  {whatsapp?.connected ? "Erneut verbinden" : "Mit Meta verbinden"}
                </a>
                <button
                  onClick={() => setShowWaManual(v => !v)}
                  className="text-xs transition-all duration-150"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {showWaManual ? "Ausblenden" : "Manuell eingeben"}
                </button>
              </div>

              {showWaManual && (
                <div className="mt-5 space-y-3 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <FieldLabel>Phone Number ID *</FieldLabel>
                    <DarkInput value={waPhoneId} onChange={setWaPhoneId} placeholder="123456789012345" />
                  </div>
                  <div>
                    <FieldLabel>Access Token *</FieldLabel>
                    <DarkInput value={waToken} onChange={setWaToken} placeholder="EAAxxxxx…" type="password" />
                  </div>
                  <div>
                    <FieldLabel>Webhook Verify Token</FieldLabel>
                    <DarkInput value={waWebhook} onChange={setWaWebhook} placeholder="mein-geheimer-token" />
                  </div>
                  <div>
                    <FieldLabel>Business Account ID</FieldLabel>
                    <DarkInput value={waWabaId} onChange={setWaWabaId} placeholder="123456789" />
                  </div>

                  {waError && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                      <Icon icon="solar:danger-triangle-linear" className="w-4 h-4 flex-shrink-0" />
                      {waError}
                    </div>
                  )}
                  {waSaved && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                      style={{ background: "rgba(242,234,211,0.1)", border: "1px solid rgba(242,234,211,0.2)", color: "#F2EAD3" }}>
                      <Icon icon="solar:check-circle-linear" className="w-4 h-4 flex-shrink-0" />
                      Konfiguration gespeichert!
                    </div>
                  )}

                  <PrimaryBtn onClick={saveWhatsAppManual} disabled={savingWa || !waPhoneId || !waToken}>
                    {savingWa
                      ? <Icon icon="solar:refresh-linear" className="w-4 h-4 animate-spin" />
                      : <Icon icon="solar:diskette-linear" className="w-4 h-4" />
                    }
                    Speichern
                  </PrimaryBtn>
                </div>
              )}
            </div>
          </div>
        </GradientCard>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <Icon icon="solar:shield-linear" className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#B3B3B3" }} />
          <p className="text-xs" style={{ color: "#B3B3B3" }}>
            Alle Zugangsdaten werden verschlüsselt gespeichert. OAuth-Tokens werden automatisch erneuert.
          </p>
        </div>
      </div>
    </div>
  );
}
