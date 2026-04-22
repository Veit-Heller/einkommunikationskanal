import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { logoUrl } = await request.json() as { logoUrl: string };

    if (!logoUrl || !logoUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Ungültiges Bildformat" }, { status: 400 });
    }

    // ~300 KB image → ~400 KB base64; reject anything larger
    if (logoUrl.length > 500_000) {
      return NextResponse.json({ error: "Bild zu groß (max. ~300 KB)" }, { status: 400 });
    }

    const row = await prisma.integration.findUnique({ where: { type: "profile" } });
    const existing = row?.config ? JSON.parse(row.config) : {};
    const updated = { ...existing, logoUrl };

    await prisma.integration.upsert({
      where: { type: "profile" },
      create: { type: "profile", config: JSON.stringify(updated) },
      update: { config: JSON.stringify(updated) },
    });

    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error("POST /api/settings/logo error:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "profile" } });
    const existing = row?.config ? JSON.parse(row.config) : {};
    const updated = { ...existing, logoUrl: null };

    await prisma.integration.upsert({
      where: { type: "profile" },
      create: { type: "profile", config: JSON.stringify(updated) },
      update: { config: JSON.stringify(updated) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settings/logo error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
