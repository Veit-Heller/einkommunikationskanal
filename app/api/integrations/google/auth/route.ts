import { NextResponse } from "next/server";

/**
 * GET /api/integrations/google/auth
 * Leitet den Browser zum Google OAuth2-Login weiter.
 * Benötigt: GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI in den Umgebungsvariablen.
 */
export async function GET() {
  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID und GOOGLE_REDIRECT_URI müssen in den Umgebungsvariablen gesetzt sein." },
      { status: 500 }
    );
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",     clientId);
  url.searchParams.set("redirect_uri",  redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope",         "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile");
  url.searchParams.set("access_type",   "offline");   // damit wir einen refresh_token bekommen
  url.searchParams.set("prompt",        "consent");   // erzwingt refresh_token auch bei re-auth

  return NextResponse.redirect(url.toString());
}
