import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

interface ColumnMapping {
  excelColumn: string;
  crmField: string;
  customFieldName: string;
}

const CRM_CORE_FIELDS = ["firstName", "lastName", "email", "phone", "company", "notes"];


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, mappings } = body as {
      rows: Record<string, string>[];
      mappings: ColumnMapping[];
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Keine Daten zum Importieren" },
        { status: 400 }
      );
    }

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const contactData: Record<string, string | null> = {
        firstName: null,
        lastName: null,
        email: null,
        phone: null,
        company: null,
        notes: null,
      };
      const customFields: Record<string, string> = {};

      for (const mapping of mappings) {
        if (mapping.crmField === "skip") continue;

        const value = row[mapping.excelColumn]?.trim() || "";
        if (!value) continue;

        if (CRM_CORE_FIELDS.includes(mapping.crmField)) {
          if (mapping.crmField === "phone") {
            contactData.phone = normalizePhone(value);
          } else {
            contactData[mapping.crmField] = value;
          }
        } else if (mapping.crmField === "custom" && mapping.customFieldName) {
          customFields[mapping.customFieldName] = value;
        }
      }

      // Skip entirely empty rows
      const hasData = Object.values(contactData).some((v) => v !== null && v !== "");
      if (!hasData && Object.keys(customFields).length === 0) {
        skipped++;
        continue;
      }

      await prisma.contact.create({
        data: {
          firstName: contactData.firstName || null,
          lastName: contactData.lastName || null,
          email: contactData.email || null,
          phone: contactData.phone || null,
          company: contactData.company || null,
          notes: contactData.notes || null,
          customFields:
            Object.keys(customFields).length > 0
              ? JSON.stringify(customFields)
              : null,
        },
      });

      created++;
    }

    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error("POST /api/import error:", error);
    return NextResponse.json(
      { error: "Fehler beim Importieren der Kontakte" },
      { status: 500 }
    );
  }
}
