import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidGoogleToken, saveGmailMessage } from "@/lib/email-sync";

/**
 * POST /api/webhooks/gmail
 * Empfängt Google Pub/Sub Push-Benachrichtigungen wenn neue E-Mails ankommen.
 * Muss in Google Cloud Pub/Sub als Push-Subscription eingetragen sein.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message?: { data?: string; messageId?: string };
      subscription?: string;
    };

    // Immer mit 200 antworten — sonst wiederholt Pub/Sub die Anfrage
    const data = body?.message?.data;
    if (!data) return NextResponse.json({ ok: true });

    let decoded: { emailAddress?: string; historyId?: string };
    try {
      decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
    } catch {
      return NextResponse.json({ ok: true });
    }

    const newHistoryId = decoded.historyId;
    if (!newHistoryId) return NextResponse.json({ ok: true });

    // Asynchron verarbeiten — sofort 200 zurück
    processGmailHistory(newHistoryId).catch(e =>
      console.error("[webhook/gmail] processing error:", e)
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook/gmail] error:", e);
    return NextResponse.json({ ok: true }); // immer 200 um Retry-Loop zu vermeiden
  }
}

async function processGmailHistory(newHistoryId: string) {
  const auth = await getValidGoogleToken();
  if (!auth) return;
  const { token: accessToken, ownEmail } = auth;

  // Gespeicherte historyId aus Integration laden
  const integration = await prisma.integration.findUnique({ where: { type: "google" } });
  const cfg = integration?.config ? JSON.parse(integration.config) as Record<string, string> : {};
  const startHistoryId = cfg.historyId || newHistoryId;

  // History seit letztem bekanntem Stand abrufen
  const histRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  // historyId immer aktualisieren, auch bei Fehler
  await prisma.integration.update({
    where: { type: "google" },
    data: { config: JSON.stringify({ ...cfg, historyId: newHistoryId }) },
  });

  if (!histRes.ok) {
    console.error("[webhook/gmail] history fetch failed:", await histRes.text());
    return;
  }

  const histData = await histRes.json() as {
    history?: { messagesAdded?: { message: { id: string } }[] }[];
  };

  const messageIds = (histData.history || [])
    .flatMap(h => h.messagesAdded || [])
    .map(m => m.message.id);

  let saved = 0;
  for (const id of messageIds) {
    if (await saveGmailMessage(id, accessToken, ownEmail)) saved++;
  }

  if (saved > 0) {
    console.log(`[webhook/gmail] ${saved} neue Nachricht(en) gespeichert`);
  }
}
