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

// ── logSystemEvent ────────────────────────────────────────────────────────────
// Creates an internal "system" message in the contact's chat timeline so the
// broker can see what happened (portal link sent, upload started, etc.) without
// it being a real outbound WhatsApp / e-mail.

export async function logSystemEvent(contactId: string, content: string): Promise<void> {
  try {
    await prisma.message.create({
      data: {
        contactId,
        channel: "system",
        direction: "outbound",
        content,
        status: "info",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[logSystemEvent] Failed to create system message:", contactId, content, err);
  }
}

// ── Default templates (editable in /automations) ─────────────────────────────

export const DEFAULT_TEMPLATES = {
  portalLink: [
    "Hallo {{vorname}},",
    "",
    "für *{{titel}}* habe ich einen sicheren Upload-Link für Sie eingerichtet.",
    "",
    "Bitte laden Sie die benötigten Unterlagen hier hoch:",
    "{{portalLink}}",
    "",
    "Bei Fragen stehe ich jederzeit zur Verfügung.",
    "",
    "{{maklername}}",
  ].join("\n"),

  reminder: [
    "Hallo {{vorname}},",
    "",
    "ich wollte kurz nachhaken — haben Sie die Unterlagen für *{{titel}}* griffbereit?",
    "",
    "Ihr Upload-Link:",
    "{{portalLink}}",
    "",
    "{{maklername}}",
  ].join("\n"),

  partial: [
    "Hallo {{vorname}},",
    "",
    "vielen Dank — wir haben {{uploadedCount}} Datei(en) für *{{titel}}* erhalten.",
    "",
    "Noch fehlende Unterlagen:",
    "{{missingList}}",
    "",
    "Bitte reichen Sie diese über denselben Link nach.",
    "",
    "{{maklername}}",
  ].join("\n"),

  completion: [
    "Hallo {{vorname}},",
    "",
    "vielen Dank! Ich habe alle Unterlagen zu *{{titel}}* erhalten und kümmere mich darum.",
    "",
    "Bei Fragen melden Sie sich gerne.",
    "",
    "Bis bald,",
    "{{maklername}}",
  ].join("\n"),
};

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

async function loadTemplates(): Promise<typeof DEFAULT_TEMPLATES> {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "automation_templates" } });
    if (row?.config) {
      return { ...DEFAULT_TEMPLATES, ...JSON.parse(row.config) };
    }
  } catch { /* ignore, use defaults */ }
  return DEFAULT_TEMPLATES;
}

function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (t, [key, val]) => t.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val),
    template,
  );
}

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
  const [brokerName, templates] = await Promise.all([getBrokerName(), loadTemplates()]);
  const link = portalLink(vorgang.token);

  // If description contains {{portalLink}}, use it as the template; else use the saved/default template
  const templateText = vorgang.description?.includes("{{portalLink}}")
    ? vorgang.description
    : templates.portalLink;

  const text = renderTemplate(templateText, {
    vorname: contact.firstName || "",
    titel: vorgang.title,
    portalLink: link,
    maklername: brokerName,
  });

  await deliverMessage(contact, vorgangId, text, `Unterlagen benötigt: ${vorgang.title}`);

  await prisma.vorgang.update({
    where: { id: vorgangId },
    data: { portalSentAt: new Date() },
  });

  await logSystemEvent(contact.id, `📋 Portal-Link gesendet: ${vorgang.title}`);
}

// ── sendReminderMessage ───────────────────────────────────────────────────────

export async function sendReminderMessage(vorgangId: string): Promise<void> {
  const vorgang = await prisma.vorgang.findUniqueOrThrow({
    where: { id: vorgangId },
    include: { contact: true },
  });

  const contact = vorgang.contact;
  const [brokerName, templates] = await Promise.all([getBrokerName(), loadTemplates()]);
  const link = portalLink(vorgang.token);

  const text = renderTemplate(templates.reminder, {
    vorname: contact.firstName || "",
    titel: vorgang.title,
    portalLink: link,
    maklername: brokerName,
  });

  await deliverMessage(contact, vorgangId, text, `Erinnerung: Unterlagen für ${vorgang.title}`);

  const newCount = vorgang.reminderCount + 1;
  await prisma.vorgang.update({
    where: { id: vorgangId },
    data: { reminderCount: { increment: 1 }, lastReminderAt: new Date() },
  });

  await logSystemEvent(contact.id, `🔔 ${newCount}. Erinnerung gesendet: ${vorgang.title}`);
}

// ── sendPartialConfirmation ───────────────────────────────────────────────────

export async function sendPartialConfirmation(vorgangId: string): Promise<void> {
  const vorgang = await prisma.vorgang.findUniqueOrThrow({
    where: { id: vorgangId },
    include: { contact: true },
  });

  const contact = vorgang.contact;
  const [brokerName, templates] = await Promise.all([getBrokerName(), loadTemplates()]);

  const checklist = JSON.parse(vorgang.checklist || "[]") as Array<{ label: string; completed: boolean }>;
  const files     = JSON.parse(vorgang.files     || "[]") as unknown[];
  const missingItems = checklist.filter(i => !i.completed);
  const uploadedCount = files.length;

  const text = renderTemplate(templates.partial, {
    vorname: contact.firstName || "",
    titel: vorgang.title,
    maklername: brokerName,
    uploadedCount: String(uploadedCount),
    missingList: missingItems.map(i => `• ${i.label}`).join("\n"),
  });

  await deliverMessage(contact, vorgangId, text, `Teilweise erhalten: ${vorgang.title}`);

  await logSystemEvent(
    contact.id,
    `📨 Teilweise eingereicht: ${uploadedCount} Datei${uploadedCount !== 1 ? "en" : ""} · noch ${missingItems.length} fehlend — ${vorgang.title}`,
  );
}

// ── sendCompletionMessage ─────────────────────────────────────────────────────

export async function sendCompletionMessage(vorgangId: string): Promise<void> {
  const vorgang = await prisma.vorgang.findUniqueOrThrow({
    where: { id: vorgangId },
    include: { contact: true },
  });

  const contact = vorgang.contact;
  const [brokerName, templates] = await Promise.all([getBrokerName(), loadTemplates()]);

  const text = renderTemplate(templates.completion, {
    vorname: contact.firstName || "",
    titel: vorgang.title,
    maklername: brokerName,
  });

  const subject = `Erledigt: ${vorgang.title}`;

  await deliverMessage(contact, vorgangId, text, subject);

  await logSystemEvent(contact.id, `✅ Vorgang abgeschlossen: ${vorgang.title}`);
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

