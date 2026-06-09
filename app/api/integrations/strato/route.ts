import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — aktuelle Strato-Konfiguration (ohne Passwort)
export async function GET() {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "strato" } });
    if (!row) return NextResponse.json({ connected: false, config: null });

    const cfg = row.config ? JSON.parse(row.config) : {};
    return NextResponse.json({
      connected: !!row.accessToken,
      config: cfg, // Passwort wird NICHT zurückgegeben
    });
  } catch (error) {
    console.error("GET /api/integrations/strato error:", error);
    return NextResponse.json({ connected: false, config: null });
  }
}

// POST — Strato-Zugangsdaten speichern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      displayName,
      imapServer = "imap.strato.de",
      imapPort   = 993,
      smtpServer = "smtp.strato.de",
      smtpPort   = 465,
    } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
    }

    const config = JSON.stringify({
      email,
      displayName: displayName || null,
      imapServer,
      imapPort,
      smtpServer,
      smtpPort,
    });

    await prisma.integration.upsert({
      where:  { type: "strato" },
      create: { type: "strato", accessToken: password, config },
      update: { accessToken: password, config },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/integrations/strato error:", error);
    return NextResponse.json({ error: "Fehler beim Speichern." }, { status: 500 });
  }
}

// DELETE — Strato-Integration entfernen
export async function DELETE() {
  try {
    await prisma.integration.deleteMany({ where: { type: "strato" } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/integrations/strato error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen." }, { status: 500 });
  }
}
