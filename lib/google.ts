/**
 * lib/google.ts
 * E-Mail-Versand via Gmail API (OAuth2).
 * Token wird in der Integration-Tabelle gespeichert und automatisch erneuert.
 */

import { prisma } from "@/lib/prisma";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GoogleEmail {
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
}

/** Liefert einen gültigen Access Token (erneuert automatisch wenn nötig). */
export async function getGoogleToken(): Promise<string> {
  const row = await prisma.integration.findUnique({ where: { type: "google" } });

  if (!row?.accessToken) {
    throw new Error("Google/Gmail nicht verbunden. Bitte unter Einstellungen → Gmail verbinden.");
  }

  // Token noch mindestens 60 Sekunden gültig?
  if (!row.expiresAt || row.expiresAt > new Date(Date.now() + 60_000)) {
    return row.accessToken;
  }

  // Refresh
  const cfg = row.config ? (JSON.parse(row.config) as { refreshToken?: string }) : {};
  if (!cfg.refreshToken) {
    throw new Error("Google-Token abgelaufen — bitte unter Einstellungen erneut verbinden.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: cfg.refreshToken,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error("Google-Token konnte nicht erneuert werden — bitte erneut verbinden.");
  }

  const tokens = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.integration.update({
    where: { type: "google" },
    data: {
      accessToken: tokens.access_token,
      expiresAt,
      config: JSON.stringify({
        ...cfg,
        refreshToken: tokens.refresh_token ?? cfg.refreshToken,
      }),
    },
  });

  return tokens.access_token;
}

/** Kodiert eine E-Mail als RFC 2822 Base64url-String für die Gmail API. */
function encodeEmail(email: GoogleEmail): string {
  const toLine   = email.to.join(", ");
  const ccLine   = email.cc?.length ? `Cc: ${email.cc.join(", ")}\r\n` : "";
  const raw =
    `To: ${toLine}\r\n` +
    ccLine +
    `Subject: =?utf-8?B?${Buffer.from(email.subject).toString("base64")}?=\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n` +
    `Content-Transfer-Encoding: base64\r\n` +
    `\r\n` +
    Buffer.from(email.body).toString("base64");

  return Buffer.from(raw).toString("base64url");
}

/** Sendet eine E-Mail via Gmail API. */
export async function sendGoogleEmail(email: GoogleEmail): Promise<void> {
  const token = await getGoogleToken();

  const res = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ raw: encodeEmail(email) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Gmail senden fehlgeschlagen: ${err.error?.message ?? res.statusText}`);
  }
}

/** Prüft ob Google/Gmail verbunden ist (Access Token in DB vorhanden). */
export async function isGoogleConfigured(): Promise<boolean> {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "google" } });
    return !!row?.accessToken;
  } catch {
    return false;
  }
}
