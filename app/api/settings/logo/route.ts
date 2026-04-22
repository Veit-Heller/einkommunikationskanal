import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

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

    const blob = await put(`settings/logo/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Load existing profile and add logoUrl
    const row = await prisma.integration.findUnique({ where: { type: "profile" } });
    const existing = row?.config ? JSON.parse(row.config) : {};
    const updated = { ...existing, logoUrl: blob.url };

    await prisma.integration.upsert({
      where: { type: "profile" },
      create: { type: "profile", config: JSON.stringify(updated) },
      update: { config: JSON.stringify(updated) },
    });

    return NextResponse.json({ logoUrl: blob.url });
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
