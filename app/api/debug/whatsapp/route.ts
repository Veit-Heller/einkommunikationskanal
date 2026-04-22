import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Temporärer Debug-Endpoint — NUR für Diagnose, danach löschen! */
export async function GET() {
  const row = await prisma.integration.findUnique({ where: { type: "whatsapp" } });
  if (!row) return NextResponse.json({ error: "Kein WhatsApp-Eintrag in DB" });

  const cfg = row.config ? JSON.parse(row.config) : {};

  return NextResponse.json({
    hasAccessToken: !!row.accessToken,
    tokenPreview: row.accessToken ? row.accessToken.slice(0, 20) + "..." : null,
    expiresAt: row.expiresAt,
    config: cfg,
    // Env vars (nur ob gesetzt, nicht der Wert)
    envVars: {
      WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_BUSINESS_ACCOUNT_ID: !!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    },
  });
}
