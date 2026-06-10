import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextMessage, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail, isEmailConfigured } from "@/lib/email";

// POST /api/messages/broadcast
// Sends a message to all members of a group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, channel, content, subject } = body;

    if (!groupId || !channel || !content) {
      return NextResponse.json({ error: "groupId, channel und content sind erforderlich" }, { status: 400 });
    }
    if ((channel === "email" || channel === "both") && !subject) {
      return NextResponse.json({ error: "Betreff für E-Mail erforderlich" }, { status: 400 });
    }

    // Load group members with contact details
    const members = await prisma.contactsOnGroup.findMany({
      where: { groupId },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (members.length === 0) {
      return NextResponse.json({ error: "Gruppe hat keine Mitglieder" }, { status: 400 });
    }

    const whatsappReady = channel !== "email"    ? await isWhatsAppConfigured() : false;
    const emailReady    = channel !== "whatsapp" ? await isEmailConfigured()    : false;

    let sent = 0;
    let failed = 0;

    for (const { contact } of members) {
      // WhatsApp
      if (channel === "whatsapp" || channel === "both") {
        if (contact.phone) {
          let status: "sent" | "failed" = "sent";
          if (whatsappReady) {
            try {
              await sendWhatsAppTextMessage(contact.phone, content);
            } catch {
              status = "failed";
            }
          }
          await prisma.message.create({
            data: {
              contactId: contact.id,
              channel: "whatsapp",
              direction: "outbound",
              content,
              status,
              sentAt: new Date(),
            },
          });
          status === "sent" ? sent++ : failed++;
        }
      }

      // Email
      if (channel === "email" || channel === "both") {
        if (contact.email) {
          let status: "sent" | "failed" = "sent";
          if (emailReady) {
            try {
              await sendEmail({
                subject,
                body: content.replace(/\n/g, "<br>"),
                to: [contact.email],
              });
            } catch {
              status = "failed";
            }
          }
          await prisma.message.create({
            data: {
              contactId: contact.id,
              channel: "email",
              direction: "outbound",
              content,
              subject,
              status,
              sentAt: new Date(),
            },
          });
          status === "sent" ? sent++ : failed++;
        }
      }
    }

    return NextResponse.json({ ok: true, sent, failed, total: members.length });
  } catch (error) {
    console.error("POST /api/messages/broadcast error:", error);
    return NextResponse.json({ error: "Fehler beim Senden" }, { status: 500 });
  }
}
