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
          scope:         "Mail.Send User.Read offline_access",
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

    await prisma.integration.upsert({
      where: { type: "outlook" },
      create: {
        type: "outlook",
        accessToken: tokens.access_token,
        expiresAt,
        config: JSON.stringify({
          refreshToken:  tokens.refresh_token ?? null,
          email:         user.mail ?? user.userPrincipalName ?? "",
          displayName:   user.displayName ?? "",
        }),
      },
      update: {
        accessToken: tokens.access_token,
        expiresAt,
        config: JSON.stringify({
          refreshToken:  tokens.refresh_token ?? null,
          email:         user.mail ?? user.userPrincipalName ?? "",
          displayName:   user.displayName ?? "",
        }),
      },
    });

    return NextResponse.redirect(`${base}/settings?outlook=success`);
  } catch (err) {
    console.error("Outlook callback error:", err);
    return NextResponse.redirect(`${base}/settings?outlook=error`);
  }
}
