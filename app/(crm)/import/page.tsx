import ExcelImporter from "@/components/ExcelImporter";
import { FileSpreadsheet, HelpCircle } from "lucide-react";

export default function ImportPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Excel Import</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Importieren Sie Kontakte aus einer Excel- oder CSV-Datei
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">1</span>
            </div>
            <span className="text-sm font-semibold text-blue-900">
              Datei hochladen
            </span>
          </div>
          <p className="text-xs text-blue-700">
            Laden Sie eine .xlsx, .xls oder .csv Datei hoch. Die erste Zeile
            sollte die Spaltenüberschriften enthalten.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">2</span>
            </div>
            <span className="text-sm font-semibold text-blue-900">
              Spalten zuordnen
            </span>
          </div>
          <p className="text-xs text-blue-700">
            Weisen Sie jeder Spalte ein CRM-Feld zu. Unbekannte Felder werden
            als benutzerdefinierte Felder gespeichert.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">3</span>
            </div>
            <span className="text-sm font-semibold text-blue-900">
              Importieren
            </span>
          </div>
          <p className="text-xs text-blue-700">
            Bestätigen Sie den Import. Alle Zeilen werden als neue Kontakte
            angelegt.
          </p>
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700">
          <span className="font-semibold">Tipp:</span> Das System erkennt
          automatisch Spalten wie{" "}
          <span className="font-mono bg-amber-100 px-1 rounded">Vorname</span>,{" "}
          <span className="font-mono bg-amber-100 px-1 rounded">E-Mail</span>,{" "}
          <span className="font-mono bg-amber-100 px-1 rounded">Telefon</span>{" "}
          etc. Telefonnummern sollten im Format{" "}
          <span className="font-mono bg-amber-100 px-1 rounded">+49 ...</span>{" "}
          für WhatsApp vorliegen.
        </div>
      </div>

      {/* Importer */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <ExcelImporter />
      </div>
    </div>
  );
}
