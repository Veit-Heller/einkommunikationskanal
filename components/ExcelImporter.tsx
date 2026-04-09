"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

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
  { value: "lastName", label: "Nachname" },
  { value: "email", label: "E-Mail" },
  { value: "phone", label: "Telefon / WhatsApp" },
  { value: "company", label: "Unternehmen" },
  { value: "notes", label: "Notizen" },
  { value: "custom", label: "Benutzerdefiniertes Feld" },
  { value: "skip", label: "Überspringen" },
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

export default function ExcelImporter() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
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
      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Lesen der Datei");
      }

      setPreview(data);
      setMappings(
        data.headers.map((col: string) => ({
          excelColumn: col,
          crmField: guessFieldMapping(col),
          customFieldName: col,
        }))
      );
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
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    );
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          mappings,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import fehlgeschlagen");
      }

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
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Import erfolgreich!
        </h2>
        <p className="text-gray-600 mb-1">
          <span className="font-semibold text-green-600">
            {importResult.created} Kontakte
          </span>{" "}
          wurden importiert.
        </p>
        {importResult.skipped > 0 && (
          <p className="text-sm text-gray-400 mb-6">
            {importResult.skipped} Zeilen übersprungen (leere Zeilen oder Duplikate).
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setPreview(null);
              setImportResult(null);
              setMappings([]);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Weiteren Import
          </button>
          <button
            onClick={() => router.push("/contacts")}
            className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700"
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
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-600 font-medium">Datei wird gelesen...</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Excel-Datei hochladen
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Ziehen Sie eine Datei hierher oder klicken Sie zum Auswählen
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Unterstützte Formate: .xlsx, .xls, .csv
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                <Upload className="w-4 h-4" />
                Datei auswählen
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview + Mapping */}
      {preview && (
        <div className="space-y-6">
          {/* File stats */}
          <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Datei eingelesen
              </p>
              <p className="text-xs text-blue-600">
                {preview.totalRows} Zeilen · {preview.headers.length} Spalten erkannt
              </p>
            </div>
            <button
              onClick={() => {
                setPreview(null);
                setMappings([]);
              }}
              className="ml-auto text-blue-400 hover:text-blue-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Column mapping */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Spalten zuordnen
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Weisen Sie jeder Excel-Spalte ein CRM-Feld zu. Die Zuordnung wurde
              automatisch erkannt und kann angepasst werden.
            </p>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Excel-Spalte
                    </th>
                    <th className="py-3 px-2 text-gray-300 w-6">
                      <ChevronRight className="w-4 h-4 mx-auto" />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      CRM-Feld
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Feldname (bei benutzerdefiniert)
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Vorschau
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping, i) => (
                    <tr key={mapping.excelColumn} className="border-t border-gray-100">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-800">
                          {mapping.excelColumn}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-300">
                        <ChevronRight className="w-4 h-4 mx-auto" />
                      </td>
                      <td className="py-2 px-4">
                        <select
                          value={mapping.crmField}
                          onChange={(e) =>
                            updateMapping(i, "crmField", e.target.value)
                          }
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                        >
                          {CRM_FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        {mapping.crmField === "custom" ? (
                          <input
                            type="text"
                            value={mapping.customFieldName}
                            onChange={(e) =>
                              updateMapping(i, "customFieldName", e.target.value)
                            }
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-gray-500 text-xs truncate max-w-[120px]">
                        {preview.rows[0]?.[mapping.excelColumn] || (
                          <span className="text-gray-300">leer</span>
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
            <h3 className="font-semibold text-gray-900 mb-3">
              Datenvorschau (erste 5 Zeilen)
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          className="py-2 px-3 text-gray-700 truncate max-w-[150px]"
                        >
                          {row[h] || <span className="text-gray-300">—</span>}
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
            <p className="text-sm text-gray-500">
              {preview.totalRows} Kontakte werden importiert
            </p>
            <button
              onClick={runImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
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
