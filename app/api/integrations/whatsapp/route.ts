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

    // Nummer bei WhatsApp registrieren (falls noch nicht aktiv)
    // Fehler 133015 = already registered → ignorieren
    let registrationStatus = "skipped";
    try {
      const registerRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/register`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            pin: "000000",
          }),
        }
      );
      const registerData = await registerRes.json();
      if (registerRes.ok) {
        registrationStatus = "registered";
      } else if (registerData?.error?.code === 133015) {
        registrationStatus = "already_registered";
      } else {
        console.warn("[whatsapp] register failed:", registerData);
        registrationStatus = `failed: ${registerData?.error?.message ?? "unknown"}`;
      }
    } catch (e) {
      console.error("[whatsapp] register error:", e);
    }

    // Konfiguration speichern
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

    return NextResponse.json({
      success: true,
      registrationStatus,
      message: "WhatsApp-Konfiguration gespeichert.",
    });
  } catch (error) {
    console.error("POST /api/integrations/whatsapp error:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der WhatsApp-Konfiguration" },
      { status: 500 }
    );
  }
}
