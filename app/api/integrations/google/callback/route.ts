import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/integrations/google/callback
 * OAuth2-Callback: tauscht den Authorization Code gegen Access + Refresh Token,
 * holt die E-Mail-Adresse via Google userinfo und speichert alles in der DB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const base  = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error || !code) {
    const msg = error || "Unbekannter Fehler";
    console.error("Google OAuth error:", msg);
    return NextResponse.redirect(`${base}/settings?google=error`);
  }

  try {
    // Token-Austausch
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
        grant_type:    "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token exchange failed:", errBody);
      throw new Error("Token-Austausch fehlgeschlagen");
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // Benutzerinfo (E-Mail-Adresse, Name)
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = userRes.ok
      ? await userRes.json() as { email?: string; name?: string }
      : {};

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.integration.upsert({
      where: { type: "google" },
      create: {
        type: "google",
        accessToken: tokens.access_token,
        expiresAt,
        config: JSON.stringify({
          refreshToken: tokens.refresh_token ?? null,
          email:        user.email ?? "",
          displayName:  user.name ?? "",
        }),
      },
      update: {
        accessToken: tokens.access_token,
        expiresAt,
        config: JSON.stringify({
          refreshToken: tokens.refresh_token ?? null,
          email:        user.email ?? "",
          displayName:  user.name ?? "",
        }),
      },
    });

    return NextResponse.redirect(`${base}/settings?google=success`);
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(`${base}/settings?google=error`);
  }
}
