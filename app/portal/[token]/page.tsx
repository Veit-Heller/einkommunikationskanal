"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Upload, X, Send } from "lucide-react";
import dynamic from "next/dynamic";

const ParticleCanvas = dynamic(() => import("@/components/ParticleCanvas"), { ssr: false });

// ─── Solar icon inlines ────────────────────────────────────────────────────
function IconShieldCheck({ size = 12, color = "#94A3B8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L4 6.5V12c0 4.477 3.582 8.09 8 8.937C16.418 20.09 20 16.477 20 12V6.5L12 2Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCheckCircle({ size = 14, color = "#10B981" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.5"/>
      <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCloseCircle({ size = 14, color = "#94A3B8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.5"/>
      <path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconCheckRead({ size = 14, color = "#059669" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M1.5 12.5L7 18l9-10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 12.5L13.5 18l9-10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Shell + Surface card helpers ─────────────────────────────────────────
const SHELL: React.CSSProperties = {
  padding: "1px",
  background: "linear-gradient(135deg, rgb(226,232,240) 0%, rgba(248,250,252,.2) 50%, rgba(203,213,225,.8) 100%)",
};
const SURFACE: React.CSSProperties = {
  background: "rgba(255,255,255,.88)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "rgba(0,0,0,.05) 0px 1px 2px 0px, rgba(0,0,0,.05) 0px 2px 20px -8px",
};

function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ ...SHELL, borderRadius: 10 }}>
      <div style={{ ...SURFACE, borderRadius: 9, ...style }} className={className}>
        {children}
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface CustomerTodo {
  id: string; label: string; type: "upload" | "task";
  status: "open" | "pending_review" | "done";
  completedAt: string | null; fileId: string | null;
}
interface UploadedFile { id: string; name: string; url: string; size: number; uploadedAt: string; }
interface Vorgang {
  id: string; title: string; description: string | null;
  checklist: CustomerTodo[]; files: UploadedFile[]; brokerFiles: UploadedFile[];
  status: string;
  contact: { firstName: string | null; lastName: string | null; company: string | null };
}
interface Profile { name: string; role: string; company: string; }

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function PortalPage({ params }: { params: { token: string } }) {
  const [vorgang, setVorgang]   = useState<Vorgang | null>(null);
  const [profile, setProfile]   = useState<Profile>({ name: "", role: "", company: "" });
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"eingereicht" | "teilweise" | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${params.token}`);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      setVorgang(data.vorgang);
      setProfile(data.profile || {});
      if (data.vorgang.status === "eingereicht") { setSubmitted(true); setSubmissionStatus("eingereicht"); }
      if (data.vorgang.status === "teilweise")   { setSubmitted(true); setSubmissionStatus("teilweise"); }
    } catch { setNotFound(true); } finally { setLoading(false); }
  }, [params.token]);

  useEffect(() => { load(); }, [load]);

  async function uploadFile(file: File) {
    setUploadError(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`/api/portal/${params.token}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
    return data.file as UploadedFile;
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    try {
      for (const f of arr) {
        const up = await uploadFile(f);
        setVorgang(v => v ? { ...v, files: [...v.files, up] } : v);
      }
    } catch (e) { setUploadError(e instanceof Error ? e.message : "Upload fehlgeschlagen"); }
    finally { setUploading(false); }
  }

  async function handleSubmit() {
    if (!vorgang) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${params.token}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: vorgang.checklist }),
      });
      const data = await res.json();
      setSubmissionStatus(data.status || "eingereicht");
      setSubmitted(true);
    } finally { setSubmitting(false); }
  }

  function startRename(f: UploadedFile) {
    setRenamingId(f.id); setRenameValue(f.name);
    setTimeout(() => renameInputRef.current?.select(), 30);
  }

  async function saveRename(fileId: string) {
    const t = renameValue.trim(); if (!t) return;
    setRenameSaving(true);
    try {
      const res = await fetch(`/api/portal/${params.token}/rename`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, name: t }),
      });
      if (res.ok) setVorgang(v => v ? { ...v, files: v.files.map(f => f.id === fileId ? { ...f, name: t } : f) } : v);
    } finally { setRenameSaving(false); setRenamingId(null); }
  }

  async function handleCheckTask(taskId: string) {
    setVorgang(v => v ? {
      ...v,
      checklist: v.checklist.map(t => t.id === taskId ? { ...t, status: "pending_review" as const, completedAt: new Date().toISOString() } : t)
    } : v);
    await fetch(`/api/portal/${params.token}/check-task`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    }).catch(() => {});
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#E2E8F0" }}>
      <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#059669", borderTopColor: "transparent" }} />
    </div>
  );

  if (notFound || !vorgang) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#E2E8F0" }}>
      <Card style={{ padding: "48px 40px", textAlign: "center", maxWidth: 380 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: "#E8E9EA", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconCloseCircle size={24} color="#A2A3A4" />
        </div>
        <h1 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 26, fontWeight: 300, letterSpacing: "-0.025em", color: "#4F4F50", margin: "0 0 8px" }}>
          Link nicht gefunden
        </h1>
        <p style={{ color: "#94A3B8", fontSize: 14, margin: 0 }}>Dieser Link ist ungültig oder abgelaufen.</p>
      </Card>
    </div>
  );

  const contactName   = [vorgang.contact.firstName, vorgang.contact.lastName].filter(Boolean).join(" ") || vorgang.contact.company || "Kunde";
  const brokerName    = profile.name    || "Ihr Versicherungsmakler";
  const brokerCompany = profile.company || "";
  const brokerRole    = profile.role    || "Versicherungsmakler";
  const brokerInitial = (profile.name || brokerRole).charAt(0).toUpperCase();

  const uploadItems  = vorgang.checklist.filter(t => t.type === "upload");
  const taskItems    = vorgang.checklist.filter(t => t.type === "task");
  const allTasksDone = taskItems.length === 0 || taskItems.every(t => t.status !== "open");
  const hasFiles     = vorgang.files.length > 0;
  const canSubmit    = (uploadItems.length === 0 && taskItems.length === 0)
    ? hasFiles
    : (uploadItems.length > 0 ? hasFiles : true) && allTasksDone;

  // ── Submitted: eingereicht ────────────────────────────────────────────────
  if (submitted && submissionStatus === "eingereicht") return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#E2E8F0" }}>
      <Card style={{ padding: "48px 40px", textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: 9999, background: "#D1FAE5", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconCheckRead size={28} color="#059669" />
        </div>
        <h1 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 30, fontWeight: 300, letterSpacing: "-0.025em", color: "#4F4F50", margin: "0 0 10px" }}>
          Vielen Dank!
        </h1>
        <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          Ihre Unterlagen wurden vollständig übermittelt. {brokerName} wird sich in Kürze bei Ihnen melden.
        </p>
        <div style={{ background: "#F4F4F5", borderRadius: 8, padding: "14px 16px", textAlign: "left" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>
            Eingereichte Dokumente
          </p>
          {vorgang.files.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {vorgang.files.map(f => (
                <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748B" }}>
                  <IconCheckCircle size={13} color="#059669" />
                  {f.name}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Keine Dateien hochgeladen</p>
          )}
        </div>
      </Card>
    </div>
  );

  // ── Submitted: teilweise ──────────────────────────────────────────────────
  if (submitted && submissionStatus === "teilweise") {
    const missingItems = vorgang.checklist.filter(i => i.status === "open");
    const pendingItems = vorgang.checklist.filter(i => i.status === "pending_review");
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#E2E8F0" }}>
        <Card style={{ padding: "40px", maxWidth: 440, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, borderRadius: 9999, background: "#FEF3C7", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 9v4M12 17h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 28, fontWeight: 300, letterSpacing: "-0.025em", color: "#4F4F50", margin: "0 0 8px" }}>
              Teilweise erhalten
            </h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>
              {brokerName} hat {vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""} erhalten
              {missingItems.length > 0 ? ` — es fehlen noch ${missingItems.length} Unterlagen.` : " — alles wird geprüft."}
            </p>
          </div>
          {vorgang.files.length > 0 && (
            <div style={{ background: "#D1FAE5", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#047857", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px" }}>✓ Bereits erhalten</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {vorgang.files.map(f => (
                  <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#065F46" }}>
                    <IconCheckCircle size={12} color="#059669" /> {f.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pendingItems.length > 0 && (
            <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px" }}>Wird geprüft</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {pendingItems.map(item => (
                  <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#78350F" }}>
                    <IconCheckCircle size={12} color="#D97706" /> {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {missingItems.length > 0 && (
            <div style={{ background: "#FFF1F2", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9F1239", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px" }}>Noch fehlend</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {missingItems.map(item => (
                  <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#881337" }}>
                    <IconCloseCircle size={12} color="#F43F5E" /> {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => { setSubmitted(false); setSubmissionStatus(null); }}
            style={{ width: "100%", padding: "14px", borderRadius: 9, background: "#059669", color: "#fff", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 1px 2px rgba(0,0,0,.05), 0 4px 20px -8px rgba(5,150,105,.3)" }}
          >
            <Upload size={17} />
            Fehlende Unterlagen nachreichen
          </button>
        </Card>
      </div>
    );
  }

  // ── Main portal ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative" style={{ background: "#E2E8F0" }}>

      {/* Particle canvas — decorative bg */}
      <ParticleCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-10">

        {/* Header */}
        <header className="glass sticky top-0 z-20">
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
            {/* Avatar — gradient shell */}
            <div style={{ padding: "1px", borderRadius: 9999, background: "linear-gradient(135deg, #D1FAE5 0%, rgba(255,255,255,.2) 50%, #92AFA0 100%)", flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9999, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>
                {brokerInitial}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#4F4F50", lineHeight: 1.2, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {brokerCompany || brokerName}
              </p>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>
                {brokerCompany ? `${brokerName} · ${brokerRole}` : brokerRole}
              </p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, background: "#F4F4F5", borderRadius: 9999, padding: "4px 10px" }}>
              <IconShieldCheck size={12} color="#94A3B8" />
              <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>Gesicherter Upload</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Hero */}
          <Card style={{ padding: "28px 28px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
              Unterlagen für
            </p>
            <h1 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 30, fontWeight: 300, letterSpacing: "-0.025em", color: "#4F4F50", margin: "0 0 12px", lineHeight: 1.15 }}>
              {contactName}
            </h1>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#D1FAE5", border: "1px solid #92AFA0", borderRadius: 9999, padding: "4px 12px" }}>
              <div style={{ width: 6, height: 6, borderRadius: 9999, background: "#059669" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#047857" }}>{vorgang.title}</span>
            </div>
            {vorgang.description && (
              <p style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(148,163,184,.2)", fontSize: 14, color: "#64748B", lineHeight: 1.65, margin: "16px 0 0" }}>
                {vorgang.description}
              </p>
            )}
          </Card>

          {/* Checklist */}
          {vorgang.checklist.length > 0 && (
            <Card style={{ padding: "24px 28px" }}>
              <h2 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 18, fontWeight: 300, letterSpacing: "-0.02em", color: "#4F4F50", margin: "0 0 18px" }}>
                Was Sie noch erledigen müssen
              </h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {vorgang.checklist.map(item => {
                  const isDone    = item.status === "done";
                  const isPending = item.status === "pending_review";
                  const isOpen    = item.status === "open";
                  return (
                    <li key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {item.type === "task" ? (
                        <button
                          onClick={() => isOpen && handleCheckTask(item.id)}
                          disabled={!isOpen}
                          style={{ flexShrink: 0, marginTop: 1, cursor: isOpen ? "pointer" : "default", background: "none", border: "none", padding: 0 }}
                        >
                          {isDone
                            ? <IconCheckCircle size={20} color="#059669" />
                            : isPending
                              ? <IconCheckCircle size={20} color="#D97706" />
                              : <div style={{ width: 20, height: 20, borderRadius: 9999, border: "1.5px solid #CBD5E1" }} />
                          }
                        </button>
                      ) : (
                        <div style={{ flexShrink: 0, marginTop: 1 }}>
                          {isDone
                            ? <IconCheckCircle size={20} color="#059669" />
                            : <div style={{ width: 20, height: 20, borderRadius: 9999, border: "1.5px solid #CBD5E1" }} />
                          }
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: isDone ? "#94A3B8" : "#4F4F50", textDecoration: isDone ? "line-through" : "none", lineHeight: 1.4 }}>
                          {item.label}
                        </span>
                        {item.type === "upload" && !isDone && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: "#94A3B8", background: "#F4F4F5", borderRadius: 9999, padding: "2px 7px" }}>
                            Hochladen
                          </span>
                        )}
                        {isPending && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: "#92400E", background: "#FEF3C7", borderRadius: 9999, padding: "2px 7px", fontWeight: 600 }}>
                            Wird geprüft
                          </span>
                        )}
                        {isOpen && item.type === "task" && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: "#94A3B8" }}>Antippen zum Abhaken</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Upload zone */}
          <Card style={{ padding: "24px 28px" }}>
            <h2 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 18, fontWeight: 300, letterSpacing: "-0.02em", color: "#4F4F50", margin: "0 0 16px" }}>
              Dokumente hochladen
            </h2>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#059669" : "#CBD5E1"}`,
                borderRadius: 8,
                padding: "36px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(209,250,229,.35)" : "rgba(248,250,252,.5)",
                transition: "all .2s ease",
              }}
            >
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={e => { if (e.target.files) handleFiles(e.target.files); }} />
              {uploading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: "#059669" }} />
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Wird hochgeladen…</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 48, height: 48, background: "#E8E9EA", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Upload size={22} style={{ color: "#A2A3A4" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#64748B", margin: "0 0 3px" }}>
                      Dateien hier ablegen
                    </p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                      oder tippen zum Auswählen · PDF, JPG, PNG, Word
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#BE123C" }}>
                <IconCloseCircle size={13} color="#F43F5E" />
                {uploadError}
              </div>
            )}

            {vorgang.files.length > 0 && (
              <ul style={{ marginTop: 14, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {vorgang.files.map(f => (
                  <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(244,244,245,.7)", borderRadius: 8, padding: "10px 12px" }} className="group">
                    <div style={{ width: 32, height: 32, background: "#fff", borderRadius: 6, border: "1px solid #E8E9EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#A2A3A4" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M14 2v6h6" stroke="#A2A3A4" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingId === f.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveRename(f.id); if (e.key === "Escape") setRenamingId(null); }}
                            style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#4F4F50", background: "#fff", border: "1px solid #92AFA0", borderRadius: 6, padding: "3px 8px", outline: "none", minWidth: 0 }}
                            autoFocus
                          />
                          <button onClick={() => saveRename(f.id)} disabled={renameSaving}
                            style={{ width: 28, height: 28, background: "#059669", color: "#fff", borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {renameSaving ? <Loader2 size={12} className="animate-spin" /> : <IconCheckCircle size={12} color="#fff" />}
                          </button>
                          <button onClick={() => setRenamingId(null)}
                            style={{ width: 28, height: 28, background: "#E8E9EA", color: "#79797A", borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#4F4F50", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                          <button onClick={() => startRename(f)}
                            style={{ flexShrink: 0, width: 20, height: 20, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#A2A3A4", opacity: 0 }}
                            className="group-hover:opacity-100 transition-opacity" title="Umbenennen">
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      )}
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>{fmtBytes(f.size)}</p>
                    </div>
                    {renamingId !== f.id && <IconCheckCircle size={16} color="#059669" />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Broker files */}
          {(vorgang.brokerFiles || []).length > 0 && (
            <Card style={{ padding: "24px 28px" }}>
              <h2 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 18, fontWeight: 300, letterSpacing: "-0.02em", color: "#4F4F50", margin: "0 0 16px" }}>
                Dokumente von Ihrem Makler
              </h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {(vorgang.brokerFiles || []).map(f => (
                  <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(244,244,245,.7)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ width: 32, height: 32, background: "#fff", borderRadius: 6, border: "1px solid #E8E9EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#A2A3A4" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M14 2v6h6" stroke="#A2A3A4" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#4F4F50", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>{fmtBytes(f.size)}</p>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#D1FAE5", border: "1px solid #92AFA0", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#047857", textDecoration: "none", flexShrink: 0, transition: "all .15s" }}>
                      Öffnen
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            style={{
              width: "100%", padding: "16px", borderRadius: 9,
              background: canSubmit ? "#059669" : "#E8E9EA",
              color: canSubmit ? "#fff" : "#A2A3A4",
              fontSize: 15, fontWeight: 600, border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: canSubmit ? "0 1px 2px rgba(0,0,0,.05), 0 4px 20px -8px rgba(5,150,105,.3)" : "none",
              transition: "all .2s ease",
            }}
          >
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Wird übermittelt…</>
              : <><Send size={17} /> Unterlagen absenden</>
            }
          </button>

          {!canSubmit && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", margin: "-4px 0 0" }}>
              {!hasFiles && uploadItems.length > 0 && "Bitte laden Sie mindestens eine Datei hoch."}
              {!allTasksDone && taskItems.length > 0 && " Bitte erledigen Sie alle Aufgaben."}
            </p>
          )}

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#C8C8C9", paddingBottom: 16 }}>
            Gesicherter Upload · {brokerCompany || brokerName}
          </p>
        </main>
      </div>
    </div>
  );
}
