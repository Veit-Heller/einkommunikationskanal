import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { error: "Die Excel-Datei enthält keine Tabellen" },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      raw: false,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Die Tabelle enthält keine Daten" },
        { status: 400 }
      );
    }

    // Get headers from first row
    const headers = Object.keys(rows[0]);

    // Convert all values to strings
    const stringRows = rows.map((row) => {
      const result: Record<string, string> = {};
      for (const key of headers) {
        result[key] = String(row[key] ?? "").trim();
      }
      return result;
    });

    return NextResponse.json({
      headers,
      rows: stringRows,
      totalRows: rows.length,
    });
  } catch (error) {
    console.error("POST /api/import/preview error:", error);
    return NextResponse.json(
      { error: "Fehler beim Verarbeiten der Datei" },
      { status: 500 }
    );
  }
}
