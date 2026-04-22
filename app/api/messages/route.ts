import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextMessage, sendWhatsAppDocument, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { put } from "@vercel/blob";

export async function GET() {
  try {
    // Get the most recent real (non-system) message per contact, ordered by newest first
    const messages = await prisma.message.findMany({
      where: { channel: { not: "system" } },
      orderBy: { createdAt: "desc" },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            phone: true,
            email: true,
          },
        },
      },
      take: 500,
    });

    // Deduplicate: keep only the latest message per contact
    const seen = new Set<string>();
    const conversations = messages.filter(m => {
      if (seen.has(m.contactId)) return false;
      seen.add(m.contactId);
      return true;
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let contactId: string;
    let channel: string;
    let content: string;
    let subject: string | undefined;
    let mediaUrl: string | null = null;
    let mediaName: string | null = null;

    // Try JSON first, fall back to FormData
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      contactId = formData.get("contactId") as string;
      channel = formData.get("channel") as string;
      content = (formData.get("content") as string) || "";
      subject = (formData.get("subject") as string) || undefined;

      const file = formData.get("file") as File | null;
      if (file) {
        const blob = await put(`messages/${contactId}/${Date.now()}-${file.name}`, file, { access: "private" });
        mediaUrl = blob.url;
        mediaName = file.name;
      }
    } else {
      const body = await request.json();
      contactId = body.contactId;
      channel = body.channel;
      content = body.content;
      subject = body.subject;
    }

    if (!contactId || !channel) {
      return NextResponse.json(
        { error: "contactId und channel sind erforderlich" },
        { status: 400 }
      );
    }

    // content can be empty if there's an attachment
    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: "content oder file ist erforderlich" },
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

      if (!(await isWhatsAppConfigured())) {
        // In demo mode: save message but don't actually send
        console.warn("WhatsApp not configured — saving message in demo mode");
        status = "sent";
      } else {
        // Meta API expects E.164 without leading +
        const phoneForApi = contact.phone.replace(/^\+/, "");
        if (mediaUrl && mediaName) {
          const msgId = await sendWhatsAppDocument(phoneForApi, mediaUrl, mediaName, content || undefined);
          externalId = msgId;
        } else {
          const result = await sendWhatsAppTextMessage(phoneForApi, content);
          externalId = result.messageId;
        }
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

      if (!(await isEmailConfigured())) {
        return NextResponse.json(
          { error: "Kein E-Mail-Anbieter verbunden. Bitte unter Einstellungen → Outlook oder Gmail verbinden." },
          { status: 400 }
        );
      }

      let emailBody = content.replace(/\n/g, "<br>");
      if (mediaUrl && mediaName) {
        emailBody += `<br><br>Anhang: ${mediaName}<br><a href="${mediaUrl}">${mediaUrl}</a>`;
      }

      await sendEmail({
        subject,
        body: emailBody,
        to: [contact.email],
      });
      status = "sent";
    } else {
      return NextResponse.json(
        { error: "Ungültiger Kanal. Erlaubt: whatsapp, email" },
        { status: 400 }
      );
    }

    // Save to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        mediaUrl,
        mediaName,
      } as any,
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
