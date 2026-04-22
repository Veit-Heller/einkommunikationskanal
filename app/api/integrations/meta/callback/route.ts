import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GRAPH = "https://graph.facebook.com/v25.0";

/**
 * GET /api/integrations/meta/callback
 * OAuth2-Callback für Meta/WhatsApp:
 *   1. Tauscht den Authorization Code gegen ein short-lived Token
 *   2. Tauscht gegen ein long-lived Token (60 Tage)
 *   3. Entdeckt WhatsApp Business Account + Phone Number ID automatisch
 *   4. Speichert alles in der DB
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const base  = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error || !code) {
    const msg = searchParams.get("error_description") || error || "Unbekannter Fehler";
    console.error("Meta OAuth error:", msg);
    return NextResponse.redirect(`${base}/settings?meta=error`);
  }

  const appId       = process.env.META_APP_ID!;
  const appSecret   = process.env.META_APP_SECRET!;
  const redirectUri = process.env.META_REDIRECT_URI!;

  try {
    // 1. Short-lived token
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code })
    );
    if (!shortRes.ok) {
      const e = await shortRes.text();
      console.error("Meta short-lived token exchange failed:", e);
      throw new Error("Token-Austausch fehlgeschlagen");
    }
    const shortData = await shortRes.json() as { access_token: string };
    const shortToken = shortData.access_token;
    if (!shortToken) throw new Error("Kein short-lived Token erhalten");

    // 2. Long-lived token (60 Tage)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type:        "fb_exchange_token",
        client_id:         appId,
        client_secret:     appSecret,
        fb_exchange_token: shortToken,
      })
    );
    const longData = await longRes.json() as {
      access_token?: string;
      expires_in?: number;
    };
    // Fallback auf short-lived wenn exchange fehlschlägt
    const longToken  = longData.access_token ?? shortToken;
    const expiresIn  = longData.expires_in ?? 60 * 24 * 60 * 60;
    const expiresAt  = new Date(Date.now() + expiresIn * 1000);

    // 3. WABA + Phone Number Discovery — mehrere Strategien
    let wabaId:       string | null = null;
    let wabaName:     string | null = null;
    let phoneNumberId: string | null = null;
    let phoneNumber:   string | null = null;

    // Strategie A: debug_token — zeigt granular_scopes mit WABA + Phone Number IDs
    // Das ist der korrekte Weg für System User Tokens
    const appToken = `${appId}|${appSecret}`;
    try {
      const r = await fetch(
        `${GRAPH}/debug_token?input_token=${longToken}&access_token=${appToken}`
      );
      const d = await r.json() as {
        data?: {
          granular_scopes?: Array<{
            scope: string;
            target_ids?: string[];
          }>;
        };
      };
      console.log("Meta debug_token:", JSON.stringify(d));

      for (const gs of d.data?.granular_scopes ?? []) {
        if (gs.scope === "whatsapp_business_management" && gs.target_ids?.[0]) {
          wabaId = gs.target_ids[0];
        }
        if (gs.scope === "whatsapp_business_messaging" && gs.target_ids?.[0]) {
          phoneNumberId = gs.target_ids[0];
        }
      }
    } catch (e) { console.error("Meta debug_token failed:", e); }

    // Strategie B: Phone Numbers direkt aus WABA laden (falls wabaId gefunden)
    if (wabaId && !phoneNumberId) {
      try {
        const r = await fetch(
          `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${longToken}`
        );
        const d = await r.json() as {
          data?: Array<{ id: string; display_phone_number: string }>;
        };
        console.log("Meta phone numbers:", JSON.stringify(d));
        const first = d.data?.[0];
        if (first) { phoneNumberId = first.id; phoneNumber = first.display_phone_number; }
      } catch (e) { console.error("Meta phone number fetch failed:", e); }
    }

    // Display-Nummer aus WABA nachladen falls nur phoneNumberId bekannt
    if (phoneNumberId && !phoneNumber) {
      try {
        const r = await fetch(
          `${GRAPH}/${phoneNumberId}?fields=display_phone_number&access_token=${longToken}`
        );
        const d = await r.json() as { display_phone_number?: string };
        phoneNumber = d.display_phone_number ?? null;
      } catch { /* ignorieren */ }
    }

    // Strategie C: WABA + Phone Number aus Env-Vars als Fallback
    if (!wabaId && process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    }
    if (!phoneNumberId && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    }

    console.log("Meta callback result:", { wabaId, phoneNumberId, phoneNumber });

    // Phone Numbers aus WABA laden
    if (wabaId) {
      try {
        const r = await fetch(
          `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${longToken}`
        );
        const d = await r.json() as {
          data?: Array<{ id: string; display_phone_number: string; verified_name?: string }>;
        };
        const first = d.data?.[0];
        if (first) {
          phoneNumberId = first.id;
          phoneNumber   = first.display_phone_number;
        }
        console.log("Meta phone numbers:", JSON.stringify(d.data));
      } catch (e) { console.error("Meta phone number fetch failed:", e); }
    }

    // Strategie D: Phone Number ID aus Env-Var
    if (!phoneNumberId && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    }

    console.log("Meta callback result:", { wabaId, phoneNumberId, phoneNumber });

    // 4. In DB speichern
    await prisma.integration.upsert({
      where: { type: "whatsapp" },
      create: {
        type:        "whatsapp",
        accessToken: longToken,
        expiresAt,
        config: JSON.stringify({ phoneNumberId, phoneNumber, wabaId, wabaName }),
      },
      update: {
        accessToken: longToken,
        expiresAt,
        config: JSON.stringify({ phoneNumberId, phoneNumber, wabaId, wabaName }),
      },
    });

    const result = phoneNumberId ? "success" : "success_partial";
    return NextResponse.redirect(`${base}/settings?meta=${result}`);
  } catch (err) {
    console.error("Meta callback error:", err);
    return NextResponse.redirect(`${base}/settings?meta=error`);
  }
}
