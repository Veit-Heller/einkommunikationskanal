import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGmailInbox, syncOutlookInbox, getValidGoogleToken, getValidOutlookToken } from "@/lib/email-sync";

/**
 * GET /api/cron/sync-emails
 * Täglich um 8 Uhr:
 * 1. Fallback-Sync (falls Webhook-Nachrichten verloren gingen)
 * 2. Gmail Watch erneuern (läuft nach 7 Tagen ab)
 * 3. Outlook Subscription erneuern (läuft nach 3 Tagen ab)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // ── 1. Fallback-Sync ───────────────────────────────────────────────────────
  const [gmailCount, outlookCount] = await Promise.allSettled([
    syncGmailInbox(),
    syncOutlookInbox(),
  ]);
  results.gmail   = gmailCount.status   === "fulfilled" ? gmailCount.value   : 0;
  results.outlook = outlookCount.status === "fulfilled" ? outlookCount.value : 0;

  // ── 2. Gmail Watch erneuern ────────────────────────────────────────────────
  const topic = process.env.GOOGLE_PUBSUB_TOPIC;
  if (topic) {
    try {
      const googleAuth = await getValidGoogleToken();
      if (googleAuth) {
        const { token, cfg } = googleAuth;

        // Erneuern wenn Watch in < 2 Tagen abläuft oder noch nicht gesetzt
        const expiration = cfg.watchExpiration ? parseInt(cfg.watchExpiration, 10) : 0;
        const expiresIn  = expiration - Date.now();
        if (!expiration || expiresIn < 2 * 24 * 60 * 60 * 1000) {
          const watchRes = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/watch",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ topicName: topic, labelIds: ["INBOX"] }),
            }
          );
          if (watchRes.ok) {
            const watchData = await watchRes.json() as { historyId: string; expiration: string };
            const integration = await prisma.integration.findUnique({ where: { type: "google" } });
            const freshCfg = integration?.config ? JSON.parse(integration.config) : cfg;
            await prisma.integration.update({
              where: { type: "google" },
              data: {
                config: JSON.stringify({
                  ...freshCfg,
                  historyId:       watchData.historyId,
                  watchExpiration: watchData.expiration,
                }),
              },
            });
            results.gmailWatchRenewed = true;
          }
        }
      }
    } catch (e) {
      console.error("[sync-emails] Gmail watch renewal failed:", e);
    }
  }

  // ── 3. Outlook Subscription erneuern ──────────────────────────────────────
  const secret = process.env.OUTLOOK_WEBHOOK_SECRET || "stevies-crm-outlook";
  const base   = process.env.NEXTAUTH_URL;
  if (base) {
    try {
      const outlookAuth = await getValidOutlookToken();
      if (outlookAuth) {
        const { token, cfg } = outlookAuth;
        const subscriptionId = cfg.subscriptionId;
        const subExpiration  = cfg.subscriptionExpiration
          ? new Date(cfg.subscriptionExpiration).getTime()
          : 0;
        const subExpiresIn = subExpiration - Date.now();

        if (!subscriptionId || subExpiresIn < 24 * 60 * 60 * 1000) {
          // Neue Subscription erstellen
          const newExpiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

          if (subscriptionId) {
            // PATCH bestehende Subscription
            const patchRes = await fetch(
              `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
              {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ expirationDateTime: newExpiration }),
              }
            );
            if (patchRes.ok) {
              const integration = await prisma.integration.findUnique({ where: { type: "outlook" } });
              const freshCfg = integration?.config ? JSON.parse(integration.config) : cfg;
              await prisma.integration.update({
                where: { type: "outlook" },
                data: { config: JSON.stringify({ ...freshCfg, subscriptionExpiration: newExpiration }) },
              });
              results.outlookSubRenewed = true;
            }
          } else {
            // Neue Subscription anlegen
            const subRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                changeType:          "created",
                notificationUrl:     `${base}/api/webhooks/outlook`,
                resource:            "me/mailFolders('inbox')/messages",
                expirationDateTime:  newExpiration,
                clientState:         secret,
              }),
            });
            if (subRes.ok) {
              const subData = await subRes.json() as { id: string; expirationDateTime: string };
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
              results.outlookSubCreated = true;
            }
          }
        }
      }
    } catch (e) {
      console.error("[sync-emails] Outlook subscription renewal failed:", e);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
