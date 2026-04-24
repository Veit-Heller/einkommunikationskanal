import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidOutlookToken } from "@/lib/email-sync";

/**
 * POST /api/integrations/outlook/subscribe
 * Erstellt eine Microsoft Graph Change Notification Subscription für den Posteingang.
 * Subscription läuft nach ~3 Tagen ab und wird täglich automatisch erneuert.
 */
export async function POST() {
  const base = process.env.NEXTAUTH_URL;
  if (!base) {
    return NextResponse.json(
      { error: "NEXTAUTH_URL ist nicht gesetzt." },
      { status: 400 }
    );
  }

  const auth = await getValidOutlookToken();
  if (!auth) {
    return NextResponse.json(
      { error: "Outlook nicht verbunden. Bitte zuerst Outlook verbinden." },
      { status: 400 }
    );
  }

  const { token: accessToken, cfg } = auth;
  const secret = process.env.OUTLOOK_WEBHOOK_SECRET || "stevies-crm-outlook";

  // Subscription läuft max. ~3 Tage — wir setzen 2 Tage und erneuern täglich per Cron
  const expirationDateTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const notificationUrl    = `${base}/api/webhooks/outlook`;

  // Bestehende Subscription löschen falls vorhanden
  if (cfg.subscriptionId) {
    await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${cfg.subscriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  const subRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType:          "created",
      notificationUrl,
      resource:            "me/mailFolders('inbox')/messages",
      expirationDateTime,
      clientState:         secret,
    }),
  });

  if (!subRes.ok) {
    const err = await subRes.text();
    console.error("[outlook/subscribe] subscription failed:", err);
    return NextResponse.json(
      { error: `Subscription konnte nicht erstellt werden: ${err}` },
      { status: 500 }
    );
  }

  const subData = await subRes.json() as { id: string; expirationDateTime: string };

  // Subscription-ID in Integration speichern
  const integration = await prisma.integration.findUnique({ where: { type: "outlook" } });
  const freshCfg = integration?.config ? JSON.parse(integration.config) : cfg;
  await prisma.integration.update({
    where: { type: "outlook" },
    data: {
      config: JSON.stringify({
        ...freshCfg,
        subscriptionId:         subData.id,
        subscriptionExpiration: subData.expirationDateTime,
      }),
    },
  });

  return NextResponse.json({
    ok:         true,
    id:         subData.id,
    expiration: subData.expirationDateTime,
  });
}

/**
 * DELETE /api/integrations/outlook/subscribe
 * Löscht die aktive Subscription.
 */
export async function DELETE() {
  const auth = await getValidOutlookToken();
  if (!auth) return NextResponse.json({ ok: true });

  const { token, cfg } = auth;
  if (cfg.subscriptionId) {
    await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${cfg.subscriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  const integration = await prisma.integration.findUnique({ where: { type: "outlook" } });
  const freshCfg = integration?.config ? JSON.parse(integration.config) : cfg;
  delete freshCfg.subscriptionId;
  delete freshCfg.subscriptionExpiration;
  await prisma.integration.update({
    where: { type: "outlook" },
    data: { config: JSON.stringify(freshCfg) },
  });

  return NextResponse.json({ ok: true });
}
