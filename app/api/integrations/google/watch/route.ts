import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidGoogleToken } from "@/lib/email-sync";

/**
 * POST /api/integrations/google/watch
 * Aktiviert Gmail Push-Benachrichtigungen über Google Pub/Sub.
 * Benötigt: GOOGLE_PUBSUB_TOPIC Umgebungsvariable
 * (z.B. "projects/mein-projekt/topics/gmail-notifications")
 */
export async function POST() {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!topic) {
    return NextResponse.json(
      { error: "GOOGLE_PUBSUB_TOPIC ist nicht gesetzt. Bitte in Vercel Environment Variables eintragen." },
      { status: 400 }
    );
  }

  const auth = await getValidGoogleToken();
  if (!auth) {
    return NextResponse.json(
      { error: "Gmail nicht verbunden. Bitte zuerst Gmail verbinden." },
      { status: 400 }
    );
  }

  const { token: accessToken } = auth;

  // Gmail Watch starten
  const watchRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName: topic,
        labelIds: ["INBOX"],
      }),
    }
  );

  if (!watchRes.ok) {
    const err = await watchRes.text();
    console.error("[google/watch] watch failed:", err);
    return NextResponse.json(
      { error: `Gmail Watch konnte nicht gestartet werden: ${err}` },
      { status: 500 }
    );
  }

  const watchData = await watchRes.json() as { historyId: string; expiration: string };

  // historyId in Integration speichern
  const integration = await prisma.integration.findUnique({ where: { type: "google" } });
  const cfg = integration?.config ? JSON.parse(integration.config) : {};
  await prisma.integration.update({
    where: { type: "google" },
    data: {
      config: JSON.stringify({
        ...cfg,
        historyId:       watchData.historyId,
        watchExpiration: watchData.expiration,
      }),
    },
  });

  return NextResponse.json({
    ok:         true,
    historyId:  watchData.historyId,
    expiration: watchData.expiration,
  });
}

/**
 * DELETE /api/integrations/google/watch
 * Deaktiviert Gmail Push-Benachrichtigungen.
 */
export async function DELETE() {
  const auth = await getValidGoogleToken();
  if (!auth) return NextResponse.json({ ok: true });

  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  const integration = await prisma.integration.findUnique({ where: { type: "google" } });
  const cfg = integration?.config ? JSON.parse(integration.config) : {};
  delete cfg.historyId;
  delete cfg.watchExpiration;
  await prisma.integration.update({
    where: { type: "google" },
    data: { config: JSON.stringify(cfg) },
  });

  return NextResponse.json({ ok: true });
}
