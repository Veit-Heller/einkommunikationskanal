import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextMessage, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail, isOutlookConfigured } from "@/lib/outlook";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, channel, content, subject } = body;

    if (!contactId || !channel || !content) {
      return NextResponse.json(
        { error: "contactId, channel und content sind erforderlich" },
        { status: 400 }
      );
    }

    // Load contact
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Kontakt nicht gefunden" },
        { status: 404 }
      );
    }

    let externalId: string | null = null;
    let status = "sent";

    if (channel === "whatsapp") {
      if (!contact.phone) {
        return NextResponse.json(
          {
            error:
              "Dieser Kontakt hat keine WhatsApp-Nummer. Bitte hinterlegen Sie eine Telefonnummer.",
          },
          { status: 400 }
        );
      }

      if (!isWhatsAppConfigured()) {
        // In demo mode: save message but don't actually send
        console.warn("WhatsApp not configured — saving message in demo mode");
        status = "sent";
      } else {
        // Meta API expects E.164 without leading +
        const phoneForApi = contact.phone.replace(/^\+/, "");
        const result = await sendWhatsAppTextMessage(phoneForApi, content);
        externalId = result.messageId;
      }
    } else if (channel === "email") {
      if (!contact.email) {
        return NextResponse.json(
          {
            error:
              "Dieser Kontakt hat keine E-Mail-Adresse. Bitte hinterlegen Sie eine E-Mail-Adresse.",
          },
          { status: 400 }
        );
      }

      if (!subject) {
        return NextResponse.json(
          { error: "Für E-Mails ist ein Betreff erforderlich" },
          { status: 400 }
        );
      }

      if (!isOutlookConfigured()) {
        // Demo mode
        console.warn("Outlook not configured — saving message in demo mode");
        status = "sent";
      } else {
        // Get Outlook integration token
        const integration = await prisma.integration.findUnique({
          where: { type: "outlook" },
        });

        if (!integration?.accessToken) {
          return NextResponse.json(
            {
              error:
                "Outlook ist nicht verbunden. Bitte verbinden Sie Outlook in den Einstellungen.",
            },
            { status: 400 }
          );
        }

        try {
          await sendEmail(integration.accessToken, {
            subject,
            body: content.replace(/\n/g, "<br>"),
            to: [contact.email],
          });
          status = "sent";
        } catch (err) {
          console.error("Outlook send error:", err);
          status = "failed";
        }
      }
    } else {
      return NextResponse.json(
        { error: "Ungültiger Kanal. Erlaubt: whatsapp, email" },
        { status: 400 }
      );
    }

    // Save to database
    const message = await prisma.message.create({
      data: {
        contactId,
        channel,
        direction: "outbound",
        content,
        subject: subject || null,
        externalId,
        status,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("POST /api/messages error:", error);
    return NextResponse.json(
      { error: "Fehler beim Senden der Nachricht" },
      { status: 500 }
    );
  }
}
