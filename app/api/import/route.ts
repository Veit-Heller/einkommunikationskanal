import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ColumnMapping {
  excelColumn: string;
  crmField: string;
  customFieldName: string;
}

const CRM_CORE_FIELDS = ["firstName", "lastName", "email", "phone", "company", "notes"];

/**
 * Normalize a German phone number to E.164 format: +49XXXXXXXXX
 *
 * Handles:
 *   0162 7734670       → +491627734670
 *   0162-773-4670      → +491627734670
 *   +49 162 7734670    → +491627734670
 *   0049162 7734670    → +491627734670
 *   +490162 7734670    → +491627734670  (wrong double-zero, fix it)
 *   491627734670       → +491627734670
 *
 * Returns null if the number can't be normalized.
 */
function normalizePhone(raw: string): string | null {
  // Strip everything except digits and leading +
  let digits = raw.replace(/[\s\-().\/]/g, "");

  if (!digits) return null;

  // Already has +
  if (digits.startsWith("+")) {
    digits = digits.slice(1); // strip the +, work with pure digits
  }

  // 0049... → 49...
  if (digits.startsWith("0049")) {
    digits = digits.slice(4);
  }

  // 49162... → keep as is (will add + below)
  // But: +490162... is wrong (has leading 0 after country code) → fix
  if (digits.startsWith("490")) {
    digits = "49" + digits.slice(3); // strip the 0 after 49
  }

  // 0162... → German national with leading 0 → replace with 49
  if (digits.startsWith("0")) {
    digits = "49" + digits.slice(1);
  }

  // Now digits should start with 49
  if (!digits.startsWith("49")) return null;

  // Sanity: German mobile/landline numbers are 11–13 digits with country code
  if (digits.length < 10 || digits.length > 14) return null;

  return "+" + digits;
}

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
