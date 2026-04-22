/**
 * lib/email.ts
 * Einheitlicher E-Mail-Versand: versucht erst Outlook, dann Google/Gmail.
 * Beide Verbindungen können gleichzeitig aktiv sein – die erste verfügbare wird genutzt.
 */

import { sendEmail as sendOutlookEmail, isOutlookConfigured } from "@/lib/outlook";
import { sendGoogleEmail, isGoogleConfigured } from "@/lib/google";

export interface EmailMessage {
  subject: string;
  body: string; // HTML
  to: string[];
  cc?: string[];
}

/**
 * Sendet eine E-Mail über den ersten verfügbaren Anbieter (Outlook → Gmail).
 * Wirft einen Fehler wenn weder Outlook noch Gmail verbunden sind.
 */
export async function sendEmail(email: EmailMessage): Promise<void> {
  if (await isOutlookConfigured()) {
    return sendOutlookEmail(email);
  }
  if (await isGoogleConfigured()) {
    return sendGoogleEmail(email);
  }
  throw new Error(
    "Kein E-Mail-Anbieter verbunden. Bitte unter Einstellungen → Outlook oder Gmail verbinden."
  );
}

/**
 * Gibt true zurück wenn mindestens ein E-Mail-Anbieter verbunden ist.
 */
export async function isEmailConfigured(): Promise<boolean> {
  return (await isOutlookConfigured()) || (await isGoogleConfigured());
}

/**
 * Gibt den Namen des aktiven E-Mail-Anbieters zurück.
 */
export async function getEmailProvider(): Promise<"outlook" | "google" | null> {
  if (await isOutlookConfigured()) return "outlook";
  if (await isGoogleConfigured()) return "google";
  return null;
}
