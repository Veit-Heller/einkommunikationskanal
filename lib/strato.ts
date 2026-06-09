/**
 * lib/strato.ts
 * E-Mail via Strato IMAP/SMTP (Passwort-basiert, kein OAuth).
 * Credentials werden in der Integration-Tabelle gespeichert:
 *   - accessToken  → Passwort
 *   - config (JSON) → { email, imapServer, imapPort, smtpServer, smtpPort, displayName?, lastSyncAt? }
 */

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface StratoConfig {
  email: string;
  imapServer: string;
  imapPort: number;
  smtpServer: string;
  smtpPort: number;
  displayName?: string;
  lastSyncAt?: string;
}

export async function getStratoCreds(): Promise<(StratoConfig & { password: string }) | null> {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "strato" } });
    if (!row?.accessToken || !row.config) return null;
    const cfg = JSON.parse(row.config) as StratoConfig;
    return { ...cfg, password: row.accessToken };
  } catch {
    return null;
  }
}

export async function isStratoConfigured(): Promise<boolean> {
  const creds = await getStratoCreds();
  return !!(creds?.email && creds?.password);
}

export interface StratoEmail {
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
}

export async function sendStratoEmail(email: StratoEmail): Promise<void> {
  const creds = await getStratoCreds();
  if (!creds) throw new Error("Strato nicht verbunden. Bitte unter Einstellungen verbinden.");

  const transporter = nodemailer.createTransport({
    host: creds.smtpServer,
    port: creds.smtpPort,
    secure: creds.smtpPort === 465,
    auth: { user: creds.email, pass: creds.password },
  });

  await transporter.sendMail({
    from: creds.displayName ? `"${creds.displayName}" <${creds.email}>` : creds.email,
    to: email.to.join(", "),
    ...(email.cc?.length ? { cc: email.cc.join(", ") } : {}),
    subject: email.subject,
    html: email.body,
  });
}

/** Verbindungstest: SMTP + IMAP prüfen */
export async function testStratoConnection(
  email: string,
  password: string,
  smtpServer: string,
  smtpPort: number,
  imapServer: string,
  imapPort: number,
): Promise<{ smtp: boolean; imap: boolean; smtpError?: string; imapError?: string }> {
  // SMTP testen
  let smtpOk = false;
  let smtpError: string | undefined;
  try {
    const t = nodemailer.createTransport({
      host: smtpServer,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: email, pass: password },
      connectionTimeout: 8000,
    });
    await t.verify();
    smtpOk = true;
  } catch (e) {
    smtpError = (e as Error).message;
  }

  // IMAP testen (nur in Node.js — nicht im Edge-Runtime)
  let imapOk = false;
  let imapError: string | undefined;
  try {
    // Dynamic import so Next.js Edge Runtime doesn't choke
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: imapServer,
      port: imapPort,
      secure: true,
      auth: { user: email, pass: password },
      logger: false,
      connectionTimeout: 8000,
    });
    await client.connect();
    await client.logout();
    imapOk = true;
  } catch (e) {
    imapError = (e as Error).message;
  }

  return { smtp: smtpOk, imap: imapOk, smtpError, imapError };
}
