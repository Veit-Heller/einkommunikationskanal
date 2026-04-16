/**
 * lib/vorgaenge.ts
 * Shared automation helpers for Vorgang workflows.
 * - sendPortalLink       → send portal URL to client, set portalSentAt
 * - sendReminderMessage  → send reminder, increment reminderCount
 * - sendCompletionMessage → tell client their docs were received
 * - createBrokerTask     → create a FollowUp task for the broker
 */

import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextMessage, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail as sendGmailEmail, isGmailConfigured } from "@/lib/gmail";

function appUrl(): string {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .replace(/\/$/, "");
}

function portalLink(token: string): string {
  return `${appUrl()}/portal/${token}`;
}

async function getBrokerName(): Promise<string> {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "profile" } });
    if (row?.config) {
      const p = JSON.parse(row.config) as { name?: string };
      if (p.name) return p.name;
    }
  } catch { /* ignore */ }
  return "Ihr Versicherungsmakler";
}

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
};

async function deliverMessage(
  contact: Contact,
  vorgangId: string,
  text: string,
  subject: string,
): Promise<void> {
  let waSent = false;
  let emailSent = false;

  // Try WhatsApp
  if (contact.phone && isWhatsAppConfigured()) {
    try {
      await sendWhatsAppTextMessage(contact.phone, text);
      waSent = true;
    } catch (err) {
      console.error("vorgaenge: WhatsApp send failed", err);
    }
  } else if (contact.phone) {
    // Demo mode: WhatsApp not configured but phone exists → mark as sent
    waSent = true;
  }

  // Try Email (Gmail)
  if (contact.email && isGmailConfigured()) {
    try {
      await sendGmailEmail({
        subject,
        body: text.replace(/\n/g, "<br>"),
        to: [contact.email],
      });
      emailSent = true;
    } catch (err) {
      console.error("vorgaenge: Gmail send failed", err);
    }
  } else if (contact.email && !isGmailConfigured()) {
    // Demo mode
    emailSent = true;
  }

  // Log messages sent
  if (waSent && contact.phone) {
    await prisma.message.create({
      data: {
        contactId: contact.id,
        channel: "whatsapp",
        direction: "outbound",
        content: text,
        status: "sent",
        sentAt: new Date(),
      },
    }).catch(() => {});
  }
  if (emailSent && contact.email) {
    await prisma.message.create({
      data: {
        contactId: contact.id,
        channel: "email",
        direction: "outbound",
        content: text,
        subject,
        status: "sent",
        sentAt: new Date(),
      },
    }).catch(() => {});
  }

  if (!waSent && !emailSent && !contact.phone && !contact.email) {
    throw new Error("Kontakt hat weder Telefonnummer noch E-Mail-Adresse");
  }
}

// ── sendPortalLink ────────────────────────────────────────────────────────────

export async function sendPortalLink(vorgangId: string): Promise<void> {
  const vorgang = await prisma.vorgang.findUniqueOrThrow({
    where: { id: vorgangId },
    include: { contact: true },
  });

  const contact = vorgang.contact;
  const brokerName = await getBrokerName();
  const link = portalLink(vorgang.token);

  const descriptionLine = vorgang.description
    ? `\n${vorgang.description}\n`
    : "";

  const text = [
    `Hallo ${contact.firstName || ""},`,
    "",
    `für *${vorgang.title}* habe ich einen sicheren Upload-Link für Sie eingerichtet.`,
    descriptionLine,
    "Bitte laden Sie die benötigten Unterlagen hier hoch:",
    link,
    "",
    "Bei Fragen stehe ich jederzeit zur Verfügung.",
    "",
    brokerName,
  ].join("\n");

  const subject = `Unterlagen benötigt: ${vorgang.title}`;

  await deliverMessage(contact, vorgangId, text, subject);

  await prisma.vorgang.update({
    where: { id: vorgangId },
    data: { portalSentAt: new Date() },
  });
}

// ── sendReminderMessage ───────────────────────────────────────────────────────

export async function sendReminderMessage(vorgangId: string): Promise<void> {
  const vorgang = await prisma.vorgang.findUniqueOrThrow({
    where: { id: vorgangId },
    include: { contact: true },
  });

  const contact = vorgang.contact;
  const brokerName = await getBrokerName();
  const link = portalLink(vorgang.token);

  const text = [
    `Hallo ${contact.firstName || ""},`,
    "",
    `ich wollte kurz nachhaken — haben Sie noch die Unterlagen für *${vorgang.title}* griffbereit?`,
    "",
    "Ihr Upload-Link:",
    link,
    "",
    brokerName,
  ].join("\n");

  const subject = `Erinnerung: Unterlagen für ${vorgang.title}`;

  await deliverMessage(contact, vorgangId, text, subject);

  await prisma.vorgang.update({
    where: { id: vorgangId },
    data: {
      reminderCount: { increment: 1 },
      lastReminderAt: new Date(),
    },
  });
}

// ── sendCompletionMessage ─────────────────────────────────────────────────────

export async function sendCompletionMessage(vorgangId: string): Promise<void> {
  const vorgang = await prisma.vorgang.findUniqueOrThrow({
    where: { id: vorgangId },
    include: { contact: true },
  });

  const contact = vorgang.contact;
  const brokerName = await getBrokerName();

  const text = [
    `Hallo ${contact.firstName || ""},`,
    "",
    `vielen Dank! Ich habe alle Unterlagen zu *${vorgang.title}* erhalten und kümmere mich darum.`,
    "",
    "Bei Fragen melden Sie sich gerne.",
    "",
    `Bis bald,`,
    brokerName,
  ].join("\n");

  const subject = `Erledigt: ${vorgang.title}`;

  await deliverMessage(contact, vorgangId, text, subject);
}

// ── createBrokerTask ──────────────────────────────────────────────────────────

export async function createBrokerTask(vorgangId: string): Promise<void> {
  const vorgang = await prisma.vorgang.findUniqueOrThrow({
    where: { id: vorgangId },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await prisma.followUp.create({
    data: {
      contactId: vorgang.contactId,
      title: `Dokumente prüfen: ${vorgang.title}`,
      type: "todo",
      dueDate: tomorrow,
      notes: `Unterlagen vom Kunden eingegangen für Vorgang "${vorgang.title}". Bitte prüfen und Vorgang abschließen.`,
    },
  });
}
