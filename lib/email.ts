/**
 * lib/email.ts
 * Einheitlicher E-Mail-Versand: Outlook → Gmail → Strato (IMAP/SMTP).
 * Die erste verfügbare Verbindung wird genutzt.
 */

import { sendEmail as sendOutlookEmail, isOutlookConfigured } from "@/lib/outlook";
import { sendGoogleEmail, isGoogleConfigured } from "@/lib/google";
import { sendStratoEmail, isStratoConfigured } from "@/lib/strato";

export interface EmailMessage {
  subject: string;
  body: string; // HTML
  to: string[];
  cc?: string[];
}

/**
 * Sendet eine E-Mail über den ersten verfügbaren Anbieter (Outlook → Gmail → Strato).
 */
export async function sendEmail(email: EmailMessage): Promise<void> {
  if (await isOutlookConfigured()) {
    return sendOutlookEmail(email);
  }
  if (await isGoogleConfigured()) {
    return sendGoogleEmail(email);
  }
  if (await isStratoConfigured()) {
    return sendStratoEmail(email);
  }
  throw new Error(
    "Kein E-Mail-Anbieter verbunden. Bitte unter Einstellungen → Outlook, Gmail oder Strato verbinden."
  );
}

/**
 * Gibt true zurück wenn mindestens ein E-Mail-Anbieter verbunden ist.
 */
export async function isEmailConfigured(): Promise<boolean> {
  return (
    (await isOutlookConfigured()) ||
    (await isGoogleConfigured()) ||
    (await isStratoConfigured())
  );
}

/**
 * Gibt den Namen des aktiven E-Mail-Anbieters zurück.
 */
export async function getEmailProvider(): Promise<"outlook" | "google" | "strato" | null> {
  if (await isOutlookConfigured()) return "outlook";
  if (await isGoogleConfigured()) return "google";
  if (await isStratoConfigured()) return "strato";
  return null;
}
