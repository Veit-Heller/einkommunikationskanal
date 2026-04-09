import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWhatsAppWebhook, WhatsAppWebhookPayload } from "@/lib/whatsapp";

// GET: Meta webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WhatsAppWebhookPayload;

    // Verify it's from WhatsApp
    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" });
    }

    const incomingMessages = parseWhatsAppWebhook(payload);

    for (const msg of incomingMessages) {
      // Format phone number to E.164 (add + if missing)
      const phone = msg.from.startsWith("+") ? msg.from : `+${msg.from}`;

      // Find or create contact by phone number
      let contact = await prisma.contact.findFirst({
        where: { phone },
      });

      if (!contact) {
        // Try without + sign
        const phoneWithoutPlus = phone.replace("+", "");
        contact = await prisma.contact.findFirst({
          where: {
            OR: [
              { phone: phoneWithoutPlus },
              { phone: `+${phoneWithoutPlus}` },
              { phone: msg.from },
            ],
          },
        });
      }

      if (!contact) {
        // Create new contact
        contact = await prisma.contact.create({
          data: {
            phone,
            firstName: null,
            lastName: null,
          },
        });
        console.log(`Created new contact for WhatsApp number: ${phone}`);
      }

      // Check for duplicate (idempotency)
      const existing = await prisma.message.findFirst({
        where: { externalId: msg.messageId },
      });

      if (!existing) {
        await prisma.message.create({
          data: {
            contactId: contact.id,
            channel: "whatsapp",
            direction: "inbound",
            content: msg.content,
            externalId: msg.messageId,
            status: "delivered",
            sentAt: msg.timestamp,
          },
        });
        console.log(`Saved incoming WhatsApp message from ${phone}`);
      }
    }

    // Meta requires a 200 response
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: "error" });
  }
}
