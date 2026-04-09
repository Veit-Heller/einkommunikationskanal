import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const { contactId, templateName, languageCode, bodyVariables } = await request.json();

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return NextResponse.json({ error: "Kontakt nicht gefunden" }, { status: 404 });
    if (!contact.phone) return NextResponse.json({ error: "Keine Telefonnummer" }, { status: 400 });

    const result = await sendWhatsAppTemplateMessage(
      contact.phone,
      templateName,
      languageCode,
      bodyVariables || []
    );

    // Save to messages
    const message = await prisma.message.create({
      data: {
        contactId,
        channel: "whatsapp",
        direction: "outbound",
        content: `[Template: ${templateName}]${bodyVariables?.length ? ` (${bodyVariables.join(", ")})` : ""}`,
        externalId: result.messageId,
        status: "sent",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
