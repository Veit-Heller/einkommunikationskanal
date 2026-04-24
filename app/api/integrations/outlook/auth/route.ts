import { NextResponse } from "next/server";

/**
 * GET /api/integrations/outlook/auth
 * Leitet den Browser zum Microsoft OAuth2-Login weiter.
 * Benötigt: OUTLOOK_CLIENT_ID, OUTLOOK_REDIRECT_URI in Vercel env vars.
 */
export async function GET() {
  const clientId    = process.env.OUTLOOK_CLIENT_ID;
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI;
  const tenant      = process.env.OUTLOOK_TENANT_ID || "common";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OUTLOOK_CLIENT_ID und OUTLOOK_REDIRECT_URI müssen in den Umgebungsvariablen gesetzt sein." },
      { status: 500 }
    );
  }

  const url = new URL(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`
  );
  url.searchParams.set("client_id",      clientId);
  url.searchParams.set("response_type",  "code");
  url.searchParams.set("redirect_uri",   redirectUri);
  url.searchParams.set("scope",          "Mail.Send Mail.Read User.Read offline_access");
  url.searchParams.set("response_mode",  "query");
  url.searchParams.set("prompt",         "select_account");

  return NextResponse.redirect(url.toString());
}
