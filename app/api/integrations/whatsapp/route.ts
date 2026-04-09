import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumberId, accessToken, webhookVerifyToken, businessAccountId } = body;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: "Phone Number ID und Access Token sind erforderlich" },
        { status: 400 }
      );
    }

    // Store WhatsApp config (encrypted in production)
    await prisma.integration.upsert({
      where: { type: "whatsapp" },
      create: {
        type: "whatsapp",
        accessToken,
        config: JSON.stringify({
          phoneNumberId,
          webhookVerifyToken,
          businessAccountId,
        }),
      },
      update: {
        accessToken,
        config: JSON.stringify({
          phoneNumberId,
          webhookVerifyToken,
          businessAccountId,
        }),
      },
    });

    // Update env hint (they need to restart to apply)
    return NextResponse.json({
      success: true,
      message:
        "WhatsApp-Konfiguration gespeichert. Bitte starten Sie die App neu und setzen Sie WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN und WHATSAPP_WEBHOOK_VERIFY_TOKEN in Ihrer .env.local Datei.",
    });
  } catch (error) {
    console.error("POST /api/integrations/whatsapp error:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der WhatsApp-Konfiguration" },
      { status: 500 }
    );
  }
}
