"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, CheckCircle2, Circle, FileText, X,
  Send, Loader2, AlertCircle, CheckCheck, Building2,
  Pencil, Check,
} from "lucide-react";

interface CustomerTodo {
  id: string;
  label: string;
  type: "upload" | "task";
  status: "open" | "pending_review" | "done";
  completedAt: string | null;
  fileId: string | null;
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

interface Vorgang {
  id: string;
  title: string;
  description: string | null;
  checklist: CustomerTodo[];
  files: UploadedFile[];
  brokerFiles: UploadedFile[];
  status: string;
  contact: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
  };
}

interface Profile {
  name: string;
  role: string;
  company: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalPage({ params }: { params: { token: string } }) {
  const [vorgang, setVorgang]     = useState<Vorgang | null>(null);
  const [profile, setProfile]     = useState<Profile>({ name: "", role: "", company: "" });
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"eingereicht" | "teilweise" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => { load(); }, [load]);

  async function uploadFile(file: File) {
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/portal/${params.token}/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
    return data.file as UploadedFile;
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of arr) {
        const uploaded = await uploadFile(file);
        setVorgang(v => v ? { ...v, files: [...v.files, uploaded] } : v);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!vorgang) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${params.token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: vorgang.checklist }),
      });
      const data = await res.json();
      setSubmissionStatus(data.status || "eingereicht");
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function startRename(file: UploadedFile) {
    setRenamingId(file.id);
    setRenameValue(file.name);
    setTimeout(() => renameInputRef.current?.select(), 30);
  }

  async function saveRename(fileId: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setRenameSaving(true);
    try {
      const res = await fetch(`/api/portal/${params.token}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, name: trimmed }),
      });
      if (res.ok) {
        setVorgang(v =>
          v ? { ...v, files: v.files.map(f => f.id === fileId ? { ...f, name: trimmed } : f) } : v
        );
      }
    } finally {
      setRenameSaving(false);
      setRenamingId(null);
    }
  }

  async function handleCheckTask(taskId: string) {
    // Optimistic update
    setVorgang(v => v ? {
      ...v,
      checklist: v.checklist.map(t =>
        t.id === taskId ? { ...t, status: "pending_review" as const, completedAt: new Date().toISOString() } : t
      )
    } : v);

    // Save to server
    await fetch(`/api/portal/${params.token}/check-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    }).catch(() => {});
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !vorgang) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h1 className="text-xl font-bold text-slate-700">Link nicht gefunden</h1>
          <p className="text-slate-400 mt-2">Dieser Link ist ungültig oder abgelaufen.</p>
        </div>
      </div>
    );
  }

  const contactName = [vorgang.contact.firstName, vorgang.contact.lastName]
    .filter(Boolean).join(" ") || vorgang.contact.company || "Kunde";

  const brokerName    = profile.name    || "Ihr Versicherungsmakler";
  const brokerCompany = profile.company || "";
  const brokerRole    = profile.role    || "Versicherungsmakler";
  const brokerInitial = (profile.name || brokerRole).charAt(0).toUpperCase();

  const uploadItems = vorgang.checklist.filter(t => t.type === "upload");
  const taskItems = vorgang.checklist.filter(t => t.type === "task");
  const allTasksDone = taskItems.length === 0 || taskItems.every(t => t.status !== "open");
  const hasFiles = vorgang.files.length > 0;
  const canSubmit = (uploadItems.length === 0 && taskItems.length === 0)
    ? hasFiles
    : (uploadItems.length > 0 ? hasFiles : true) && allTasksDone;

  // ── Submitted state ──────────────────────────────────────────────────────

  if (submitted && submissionStatus === "eingereicht") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-lime-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCheck className="w-10 h-10 text-lime-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Vielen Dank!</h1>
          <p className="text-slate-500 mb-6">
            Ihre Unterlagen wurden vollständig übermittelt. {brokerName} wird sich in Kürze bei Ihnen melden.
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Eingereichte Dokumente</p>
            {vorgang.files.length > 0 ? (
              <ul className="space-y-1">
                {vorgang.files.map(f => (
                  <li key={f.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-lime-500 flex-shrink-0" />
                    {f.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Keine Dateien hochgeladen</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (submitted && submissionStatus === "teilweise") {
    const missingItems = vorgang.checklist.filter(i => i.status !== "done");
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Teilweise erhalten</h1>
            <p className="text-slate-500">
              {brokerName} hat {vorgang.files.length} Datei{vorgang.files.length !== 1 ? "en" : ""} erhalten — es fehlen noch {missingItems.length} Unterlagen.
            </p>
          </div>

          {vorgang.files.length > 0 && (
            <div className="bg-lime-50 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-lime-700 uppercase tracking-wider mb-2">✓ Bereits erhalten</p>
              <ul className="space-y-1">
                {vorgang.files.map(f => (
                  <li key={f.id} className="flex items-center gap-2 text-sm text-lime-800">
                    <CheckCircle2 className="w-4 h-4 text-lime-500 flex-shrink-0" />
                    {f.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingItems.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-4 mb-6">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Noch fehlend</p>
              <ul className="space-y-1">
                {missingItems.map(item => (
                  <li key={item.id} className="flex items-center gap-2 text-sm text-amber-800">
                    <Circle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => { setSubmitted(false); setSubmissionStatus(null); }}
            className="w-full py-4 rounded-2xl bg-lime-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-lime-600 transition-all shadow-sm shadow-lime-500/25"
          >
            <Upload className="w-5 h-5" />
            Fehlende Unterlagen nachreichen
          </button>
        </div>
      </div>
    );
  }

  // ── Main portal ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header / Branding */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-lime-500 flex items-center justify-center text-white text-lg font-bold shadow-sm shadow-lime-500/30 flex-shrink-0">
            {brokerInitial}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-base leading-tight">{brokerCompany || brokerName}</p>
            <p className="text-xs text-slate-400">{brokerCompany ? `${brokerName} · ${brokerRole}` : brokerRole}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">

        {/* Hero card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unterlagen für</p>
          <h1 className="text-2xl font-bold text-slate-900">{contactName}</h1>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-lime-50 border border-lime-100 rounded-full">
            <div className="w-1.5 h-1.5 bg-lime-500 rounded-full" />
            <span className="text-xs font-semibold text-lime-700">{vorgang.title}</span>
          </div>

          {vorgang.description && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
              {vorgang.description}
            </p>
          )}
        </div>

        {/* What the customer needs to do */}
        {vorgang.checklist.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Was Sie noch erledigen müssen
            </h2>
            <ul className="space-y-3">
              {vorgang.checklist.map((item) => {
                const isDone = item.status === "done";
                const isPending = item.status === "pending_review";
                const isOpen = item.status === "open";

                return (
                  <li key={item.id} className="flex items-center gap-3">
                    {/* Icon / checkbox */}
                    {item.type === "task" ? (
                      <button
                        onClick={() => isOpen && handleCheckTask(item.id)}
                        disabled={!isOpen}
                        className="flex-shrink-0"
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isDone ? "bg-lime-500 border-lime-500" :
                          isPending ? "bg-amber-400 border-amber-400" :
                          "border-slate-300 hover:border-lime-400"
                        }`}>
                          {(isDone || isPending) && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    ) : (
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isDone ? "bg-lime-500 border-lime-500" : "border-slate-200"
                      }`}>
                        {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    )}

                    {/* Label + status */}
                    <div className="flex-1">
                      <span className={`text-sm ${isDone ? "line-through text-slate-400" : "text-slate-700"}`}>
                        {item.label}
                      </span>
                      {item.type === "upload" && !isDone && (
                        <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          Dokument hochladen
                        </span>
                      )}
                      {isPending && (
                        <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                          Eingereicht · wird geprüft
                        </span>
                      )}
                      {isOpen && item.type === "task" && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          Zum Abhaken antippen
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Upload zone */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-400" />
            Dokumente hochladen
          </h2>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-lime-400 bg-lime-50"
                : "border-slate-200 hover:border-lime-300 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) handleFiles(e.target.files); }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-lime-500 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Wird hochgeladen...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Upload className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Dateien hier ablegen
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    oder tippen zum Auswählen · PDF, JPG, PNG, Word
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Uploaded files */}
          {vorgang.files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {vorgang.files.map(f => (
                <li key={f.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 group">
                  <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {renamingId === f.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveRename(f.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="flex-1 text-sm font-medium text-slate-700 bg-white border border-lime-400 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-lime-300 min-w-0"
                          autoFocus
                        />
                        <button
                          onClick={() => saveRename(f.id)}
                          disabled={renameSaving}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-lime-500 text-white hover:bg-lime-600 flex-shrink-0 transition-colors"
                        >
                          {renameSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 text-slate-500 hover:bg-slate-300 flex-shrink-0 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                        <button
                          onClick={() => startRename(f)}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 transition-all"
                          title="Umbenennen"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">{formatBytes(f.size)}</p>
                  </div>
                  {renamingId !== f.id && (
                    <CheckCircle2 className="w-5 h-5 text-lime-500 flex-shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Broker files — Dokumente vom Makler */}
        {(vorgang.brokerFiles || []).length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Dokumente von Ihrem Makler
            </h2>
            <ul className="space-y-2">
              {(vorgang.brokerFiles || []).map((f) => (
                <li key={f.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatBytes(f.size)}</p>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-50 text-lime-700 border border-lime-200 rounded-xl text-xs font-semibold hover:bg-lime-100 transition-colors flex-shrink-0"
                  >
                    Öffnen
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className={`w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all shadow-sm ${
            canSubmit
              ? "bg-lime-500 text-white hover:bg-lime-600 shadow-lime-500/25"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Wird übermittelt...</>
          ) : (
            <><Send className="w-5 h-5" /> Unterlagen absenden</>
          )}
        </button>

        {!canSubmit && (
          <p className="text-center text-xs text-slate-400">
            {!hasFiles && uploadItems.length > 0 && "Bitte laden Sie mindestens eine Datei hoch."}
            {!allTasksDone && taskItems.length > 0 && " Bitte erledigen Sie alle Aufgaben."}
          </p>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-300 pb-4">
          Gesicherter Upload · {brokerCompany || brokerName}
        </p>
      </div>
    </div>
  );
}
