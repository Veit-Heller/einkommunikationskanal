import { NextRequest, NextResponse } from "next/server";
import { getValidOutlookToken, saveOutlookMessage } from "@/lib/email-sync";

/**
 * POST /api/webhooks/outlook
 * Empfängt Microsoft Graph Change Notifications wenn neue E-Mails ankommen.
 *
 * Microsoft sendet zuerst eine Validierungsanfrage (validationToken als Query-Parameter),
 * danach reguläre Change Notifications als POST-Body.
 */
export async function POST(request: NextRequest) {
  // ── Schritt 1: Validierungsanfrage von Microsoft ────────────────────────────
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken) {
    // Microsoft erwartet den Token als plain/text zurück
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // ── Schritt 2: Change Notification verarbeiten ──────────────────────────────
  try {
    const body = await request.json() as {
      value?: {
        changeType: string;
        clientState?: string;
        resourceData?: { id?: string };
      }[];
    };

    const notifications = body?.value || [];
    if (notifications.length === 0) return NextResponse.json({ ok: true });

    const secret = process.env.OUTLOOK_WEBHOOK_SECRET;

    // clientState verifizieren (falls gesetzt)
    for (const n of notifications) {
      if (secret && n.clientState !== secret) {
        console.warn("[webhook/outlook] clientState mismatch — notification ignored");
        continue;
      }
      if (n.changeType !== "created") continue;

      const messageId = n.resourceData?.id;
      if (!messageId) continue;

      // Asynchron verarbeiten
      processOutlookMessage(messageId).catch(e =>
        console.error("[webhook/outlook] processing error:", e)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook/outlook] error:", e);
    return NextResponse.json({ ok: true });
  }
}

async function processOutlookMessage(messageId: string) {
  const auth = await getValidOutlookToken();
  if (!auth) return;
  const { token, ownEmail } = auth;

  const saved = await saveOutlookMessage(messageId, token, ownEmail);
  if (saved) {
    console.log(`[webhook/outlook] Neue Nachricht gespeichert: ${messageId}`);
  }
}
