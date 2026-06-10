import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/integrations/outlook/callback
 * OAuth2-Callback: tauscht den Authorization Code gegen Access + Refresh Token,
 * holt den Anzeigenamen/E-Mail via Graph API und speichert alles in der DB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const base  = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error || !code) {
    const msg = searchParams.get("error_description") || error || "Unbekannter Fehler";
    console.error("Outlook OAuth error:", msg);
    return NextResponse.redirect(`${base}/settings?outlook=error`);
  }

  try {
    const tenant = process.env.OUTLOOK_TENANT_ID || "common";

    // Token-Austausch
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     process.env.OUTLOOK_CLIENT_ID!,
          client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
          code,
          redirect_uri:  process.env.OUTLOOK_REDIRECT_URI!,
          grant_type:    "authorization_code",
          scope:         "Mail.Send Mail.Read User.Read offline_access",
        }),
      }
    );

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Outlook token exchange failed:", errBody);
      throw new Error("Token-Austausch fehlgeschlagen");
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // Benutzerinfo (E-Mail-Adresse, Anzeigename)
    const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = userRes.ok
      ? await userRes.json() as { mail?: string; userPrincipalName?: string; displayName?: string }
      : {};

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Andere E-Mail-Anbieter trennen — nur eine Verbindung aktiv
    await prisma.integration.deleteMany({ where: { type: { in: ["google", "strato"] } } });

    const baseConfig = {
      refreshToken:  tokens.refresh_token ?? null,
      email:         user.mail ?? user.userPrincipalName ?? "",
      displayName:   user.displayName ?? "",
    };

    await prisma.integration.upsert({
      where: { type: "outlook" },
      create: { type: "outlook", accessToken: tokens.access_token, expiresAt, config: JSON.stringify(baseConfig) },
      update: { accessToken: tokens.access_token, expiresAt, config: JSON.stringify(baseConfig) },
    });

    // Outlook-Webhook-Subscription sofort erstellen damit Antworten in Echtzeit ankommen
    const secret      = process.env.OUTLOOK_WEBHOOK_SECRET || "stevies-crm-outlook";
    const notifUrl    = `${base}/api/webhooks/outlook`;
    const expiration  = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const subRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType:         "created",
          notificationUrl:    notifUrl,
          resource:           "me/mailFolders('inbox')/messages",
          expirationDateTime: expiration,
          clientState:        secret,
        }),
      });
      if (subRes.ok) {
        const subData = await subRes.json() as { id: string; expirationDateTime: string };
        await prisma.integration.update({
          where: { type: "outlook" },
          data: {
            config: JSON.stringify({
              ...baseConfig,
              subscriptionId:         subData.id,
              subscriptionExpiration: subData.expirationDateTime,
            }),
          },
        });
      }
    } catch (e) {
      console.error("Outlook subscription creation failed:", e);
      // Non-fatal — cron wird es beim nächsten Lauf erstellen
    }

    return NextResponse.redirect(`${base}/settings?outlook=success`);
  } catch (err) {
    console.error("Outlook callback error:", err);
    return NextResponse.redirect(`${base}/settings?outlook=error`);
  }
}
