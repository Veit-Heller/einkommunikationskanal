import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 300 * 1024; // 300 KB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei angegeben" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Nur Bilddateien erlaubt" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Bild zu groß (max. 300 KB)" }, { status: 400 });
    }

    // Convert to base64 data URL — stored directly in profile config, no external storage needed
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const logoUrl = `data:${file.type};base64,${base64}`;

    // Merge into existing profile config
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
    return NextResponse.json({ error: "Fehler beim Hochladen" }, { status: 500 });
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
