import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextMessage, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail, isOutlookConfigured } from "@/lib/outlook";

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contacts: {
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        parent: { select: { id: true, name: true } },
        followUps: { select: { id: true, name: true, status: true, createdAt: true } },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kampagnen" },
      { status: 500 }
    );
  }
}

function renderTemplate(template: string, contact: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}): string {
  return template
    .replace(/\{\{vorname\}\}/gi, contact.firstName || "")
    .replace(/\{\{nachname\}\}/gi, contact.lastName || "")
    .replace(/\{\{name\}\}/gi, [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "")
    .replace(/\{\{email\}\}/gi, contact.email || "")
    .replace(/\{\{telefon\}\}/gi, contact.phone || "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, channel, template, subject, contactIds, send, parentId } = body;

    if (!name || !channel || !template || !contactIds?.length) {
      return NextResponse.json(
        { error: "Name, Kanal, Vorlage und Empfänger sind erforderlich" },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        channel,
        template,
        subject: subject || null,
        status: send ? "sending" : "draft",
        parentId: parentId || null,
        contacts: {
          create: contactIds.map((id: string) => ({
            contactId: id,
            status: "pending",
          })),
        },
      },
      include: {
        contacts: {
          include: { contact: true },
        },
      },
    });

    if (!send) {
      return NextResponse.json({ campaign }, { status: 201 });
    }

    // Send messages
    let sentCount = 0;
    let failedCount = 0;

    const outlookIntegration = channel !== "whatsapp"
      ? await prisma.integration.findUnique({ where: { type: "outlook" } })
      : null;

    for (const cc of campaign.contacts) {
      const contact = cc.contact;
      let whatsappStatus: "sent" | "failed" | "pending" = "pending";
      let emailStatus: "sent" | "failed" | "pending" = "pending";

      const personalizedText = renderTemplate(template, contact);
      const personalizedSubject = subject ? renderTemplate(subject, contact) : null;

      // Send WhatsApp
      if (channel === "whatsapp" || channel === "both") {
        if (contact.phone) {
          if (!isWhatsAppConfigured()) {
            whatsappStatus = "sent"; // demo mode
          } else {
            try {
              await sendWhatsAppTextMessage(contact.phone, personalizedText);
              whatsappStatus = "sent";
            } catch {
              whatsappStatus = "failed";
            }
          }

          await prisma.message.create({
            data: {
              contactId: contact.id,
              channel: "whatsapp",
              direction: "outbound",
              content: personalizedText,
              status: whatsappStatus,
              sentAt: new Date(),
            },
          });
        }
      }

      // Send Email
      if (channel === "email" || channel === "both") {
        if (contact.email && personalizedSubject) {
          if (!isOutlookConfigured() || !outlookIntegration?.accessToken) {
            emailStatus = "sent"; // demo mode
          } else {
            try {
              await sendEmail(outlookIntegration.accessToken, {
                subject: personalizedSubject,
                body: personalizedText.replace(/\n/g, "<br>"),
                to: [contact.email],
              });
              emailStatus = "sent";
            } catch {
              emailStatus = "failed";
            }
          }

          await prisma.message.create({
            data: {
              contactId: contact.id,
              channel: "email",
              direction: "outbound",
              content: personalizedText,
              subject: personalizedSubject,
              status: emailStatus,
              sentAt: new Date(),
            },
          });
        }
      }

      // Determine overall contact status
      const overallFailed =
        (channel === "whatsapp" && whatsappStatus === "failed") ||
        (channel === "email" && emailStatus === "failed") ||
        (channel === "both" && whatsappStatus === "failed" && emailStatus === "failed");

      if (overallFailed) {
        failedCount++;
      } else {
        sentCount++;
      }

      await prisma.campaignContact.update({
        where: { id: cc.id },
        data: {
          status: overallFailed ? "failed" : "sent",
          sentAt: new Date(),
        },
      });
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sent" },
    });

    return NextResponse.json(
      { campaign, sentCount, failedCount },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Kampagne" },
      { status: 500 }
    );
  }
}
