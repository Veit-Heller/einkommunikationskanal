"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

interface ColumnMapping {
  excelColumn: string;
  crmField: string;
  customFieldName: string;
}

interface PreviewData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

const CRM_FIELD_OPTIONS = [
  { value: "firstName", label: "Vorname" },
  { value: "lastName",  label: "Nachname" },
  { value: "email",     label: "E-Mail" },
  { value: "phone",     label: "Telefon / WhatsApp" },
  { value: "company",   label: "Unternehmen" },
  { value: "notes",     label: "Notizen" },
  { value: "custom",    label: "Benutzerdefiniertes Feld" },
  { value: "skip",      label: "Überspringen" },
];

function guessFieldMapping(header: string): string {
  const h = header.toLowerCase().trim();
  if (h.includes("vorname") || h === "first name" || h === "firstname") return "firstName";
  if (h.includes("nachname") || h.includes("familienname") || h === "last name" || h === "lastname") return "lastName";
  if (h.includes("mail") || h.includes("email")) return "email";
  if (h.includes("tel") || h.includes("phone") || h.includes("mobil") || h.includes("handy") || h.includes("whatsapp")) return "phone";
  if (h.includes("unternehmen") || h.includes("firma") || h.includes("company") || h.includes("arbeit")) return "company";
  if (h.includes("notiz") || h.includes("note") || h.includes("anmerkung")) return "notes";
  return "custom";
}

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "6px 10px",
  fontSize: 12,
  color: "#FFFFFF",
  outline: "none",
  width: "100%",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "6px 10px",
  fontSize: 12,
  color: "#FFFFFF",
  outline: "none",
  width: "100%",
};

export default function ExcelImporter() {
  const router = useRouter();
  const [dragOver, setDragOver]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [preview, setPreview]         = useState<PreviewData | null>(null);
  const [mappings, setMappings]       = useState<ColumnMapping[]>([]);
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Bitte laden Sie eine Excel- oder CSV-Datei hoch (.xlsx, .xls, .csv)");
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/import/preview", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Lesen der Datei");
      setPreview(data);
      setMappings(data.headers.map((col: string) => ({
        excelColumn: col,
        crmField: guessFieldMapping(col),
        customFieldName: col,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Verarbeiten der Datei");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function updateMapping(index: number, field: string, value: string) {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows, mappings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import fehlgeschlagen");
      setImportResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Importfehler");
    } finally {
      setImporting(false);
    }
  }

  if (importResult) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(52,211,153,0.1)" }}
        >
          <Icon icon="solar:check-circle-linear" style={{ color: "rgba(52,211,153,1)", width: 32, height: 32 }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "#FFFFFF" }}>Import erfolgreich!</h2>
        <p className="mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          <span className="font-semibold" style={{ color: "rgba(52,211,153,1)" }}>{importResult.created} Kontakte</span> wurden importiert.
        </p>
        {importResult.skipped > 0 && (
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
            {importResult.skipped} Zeilen übersprungen (leere Zeilen oder Duplikate).
          </p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={() => { setPreview(null); setImportResult(null); setMappings([]); }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Weiteren Import
          </button>
          <button
            onClick={() => router.push("/contacts")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "#F2EAD3", color: "#000000" }}
          >
            Zu Kontakten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      {!preview && (
        <div
          className="rounded-2xl p-12 text-center transition-all"
          style={{
            border: dragOver ? "2px dashed rgba(242,234,211,0.5)" : "2px dashed rgba(255,255,255,0.1)",
            background: dragOver ? "rgba(242,234,211,0.04)" : "transparent",
            transition: "all 150ms ease",
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "2px solid rgba(242,234,211,0.3)", borderTopColor: "#F2EAD3" }} />
              <p className="font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Datei wird gelesen...</p>
            </div>
          ) : (
            <>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon icon="solar:document-text-linear" style={{ color: "rgba(255,255,255,0.4)", width: 28, height: 28 }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: "#FFFFFF" }}>Excel-Datei hochladen</h3>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Ziehen Sie eine Datei hierher oder klicken Sie zum Auswählen
              </p>
              <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.25)" }}>
                Unterstützte Formate: .xlsx, .xls, .csv
              </p>
              <label
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
                style={{ background: "#F2EAD3", color: "#000000", transition: "opacity 150ms ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >
                <Icon icon="solar:upload-minimalistic-linear" style={{ width: 16, height: 16 }} />
                Datei auswählen
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileInput} className="hidden" />
              </label>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
        >
          <Icon icon="solar:danger-triangle-linear" style={{ width: 16, height: 16, flexShrink: 0 }} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      {/* Preview + Mapping */}
      {preview && (
        <div className="space-y-6">
          {/* File stats */}
          <div
            className="flex items-center gap-4 rounded-xl px-4 py-3"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <Icon icon="solar:document-text-linear" style={{ color: "rgba(96,165,250,1)", width: 20, height: 20 }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "rgba(147,197,253,1)" }}>Datei eingelesen</p>
              <p className="text-xs" style={{ color: "rgba(96,165,250,0.7)" }}>
                {preview.totalRows} Zeilen · {preview.headers.length} Spalten erkannt
              </p>
            </div>
            <button
              onClick={() => { setPreview(null); setMappings([]); }}
              className="ml-auto transition-colors"
              style={{ color: "rgba(96,165,250,0.6)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(96,165,250,1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(96,165,250,0.6)"; }}
            >
              <Icon icon="solar:close-circle-linear" style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Column mapping */}
          <div>
            <h3 className="font-semibold mb-1" style={{ color: "#FFFFFF" }}>Spalten zuordnen</h3>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              Weisen Sie jeder Excel-Spalte ein CRM-Feld zu. Die Zuordnung wurde automatisch erkannt und kann angepasst werden.
            </p>

            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Excel-Spalte
                    </th>
                    <th className="py-3 px-2 w-6" style={{ color: "rgba(255,255,255,0.15)" }}>
                      <Icon icon="solar:arrow-right-linear" style={{ width: 16, height: 16, margin: "0 auto" }} />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                      CRM-Feld
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Feldname (benutzerdefiniert)
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Vorschau
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping, i) => (
                    <tr key={mapping.excelColumn} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="py-3 px-4">
                        <span className="font-medium" style={{ color: "#FFFFFF" }}>{mapping.excelColumn}</span>
                      </td>
                      <td className="py-2 px-2" style={{ color: "rgba(255,255,255,0.15)" }}>
                        <Icon icon="solar:arrow-right-linear" style={{ width: 16, height: 16, margin: "0 auto" }} />
                      </td>
                      <td className="py-2 px-4">
                        <select
                          value={mapping.crmField}
                          onChange={e => updateMapping(i, "crmField", e.target.value)}
                          style={{ ...selectStyle }}
                        >
                          {CRM_FIELD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} style={{ background: "#1C1C1C" }}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        {mapping.crmField === "custom" ? (
                          <input
                            type="text"
                            value={mapping.customFieldName}
                            onChange={e => updateMapping(i, "customFieldName", e.target.value)}
                            style={inputStyle}
                            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                          />
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-xs truncate max-w-[120px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {preview.rows[0]?.[mapping.excelColumn] || (
                          <span style={{ color: "rgba(255,255,255,0.15)" }}>leer</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data preview */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: "#FFFFFF" }}>Datenvorschau (erste 5 Zeilen)</h3>
            <div
              className="overflow-x-auto rounded-xl"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {preview.headers.map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      {preview.headers.map(h => (
                        <td key={h} className="py-2 px-3 truncate max-w-[150px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                          {row[h] || <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              {preview.totalRows} Kontakte werden importiert
            </p>
            <button
              onClick={runImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#F2EAD3", color: "#000000", opacity: importing ? 0.7 : 1, transition: "all 150ms ease" }}
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }} />
                  Importiere...
                </>
              ) : (
                <>
                  <Icon icon="solar:upload-minimalistic-linear" style={{ width: 16, height: 16 }} />
                  {preview.totalRows} Kontakte importieren
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
