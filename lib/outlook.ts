/**
 * lib/outlook.ts
 * E-Mail-Versand via Microsoft Graph API (OAuth2).
 * Token wird in der Integration-Tabelle gespeichert und automatisch erneuert.
 */

import { prisma } from "@/lib/prisma";

const GRAPH_API = "https://graph.microsoft.com/v1.0";

function tokenUrl() {
  const tenant = process.env.OUTLOOK_TENANT_ID || "common";
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}

export interface OutlookEmail {
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
}

/** Liefert einen gültigen Access Token (erneuert automatisch wenn nötig). */
export async function getOutlookToken(): Promise<string> {
  const row = await prisma.integration.findUnique({ where: { type: "outlook" } });

  if (!row?.accessToken) {
    throw new Error("Outlook nicht verbunden. Bitte unter Einstellungen → Outlook verbinden.");
  }

  // Token noch mindestens 60 Sekunden gültig?
  if (!row.expiresAt || row.expiresAt > new Date(Date.now() + 60_000)) {
    return row.accessToken;
  }

  // Refresh
  const cfg = row.config ? (JSON.parse(row.config) as { refreshToken?: string }) : {};
  if (!cfg.refreshToken) {
    throw new Error("Outlook-Token abgelaufen — bitte unter Einstellungen erneut verbinden.");
  }

  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: cfg.refreshToken,
      grant_type:    "refresh_token",
      scope:         "Mail.Send User.Read offline_access",
    }),
  });

  if (!res.ok) {
    throw new Error("Outlook-Token konnte nicht erneuert werden — bitte erneut verbinden.");
  }

  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in as number) * 1000);

  await prisma.integration.update({
    where: { type: "outlook" },
    data: {
      accessToken: tokens.access_token as string,
      expiresAt,
      config: JSON.stringify({
        ...cfg,
        refreshToken: (tokens.refresh_token as string | undefined) ?? cfg.refreshToken,
      }),
    },
  });

  return tokens.access_token as string;
}

/** Sendet eine E-Mail via Microsoft Graph API. */
export async function sendEmail(email: OutlookEmail): Promise<void> {
  const token = await getOutlookToken();

  const res = await fetch(`${GRAPH_API}/me/sendMail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: {
        subject: email.subject,
        body: { contentType: "HTML", content: email.body },
        toRecipients: email.to.map(a => ({ emailAddress: { address: a } })),
        ccRecipients: (email.cc ?? []).map(a => ({ emailAddress: { address: a } })),
      },
      saveToSentItems: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`E-Mail senden fehlgeschlagen: ${err.error?.message ?? res.statusText}`);
  }
}

/** Prüft ob Outlook verbunden ist (Access Token in DB vorhanden). */
export async function isOutlookConfigured(): Promise<boolean> {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "outlook" } });
    return !!row?.accessToken;
  } catch {
    return false;
  }
}
