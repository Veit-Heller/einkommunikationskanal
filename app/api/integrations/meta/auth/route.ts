import { NextResponse } from "next/server";

/**
 * GET /api/integrations/meta/auth
 * Leitet den Browser zum Meta (Facebook) OAuth2-Login weiter.
 * Nach erfolgreichem Login entdeckt der Callback automatisch:
 *   - WhatsApp Business Account ID (WABA)
 *   - Phone Number ID
 *   - Long-lived Access Token
 *
 * Benötigt: META_APP_ID, META_REDIRECT_URI in den Umgebungsvariablen.
 */
export async function GET() {
  const appId       = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: "META_APP_ID und META_REDIRECT_URI müssen in den Umgebungsvariablen gesetzt sein." },
      { status: 500 }
    );
  }

  const url = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  url.searchParams.set("client_id",     appId);
  url.searchParams.set("redirect_uri",  redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope",
    "whatsapp_business_management,whatsapp_business_messaging,business_management"
  );

  return NextResponse.redirect(url.toString());
}
