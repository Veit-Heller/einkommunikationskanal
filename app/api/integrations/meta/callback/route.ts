import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GRAPH = "https://graph.facebook.com/v25.0";

/**
 * GET /api/integrations/meta/callback
 * OAuth2-Callback für Meta/WhatsApp:
 *   1. Tauscht den Authorization Code gegen ein short-lived Token
 *   2. Tauscht gegen ein long-lived Token (60 Tage gültig)
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
      access_token: string;
      expires_in?: number;
      token_type?: string;
    };
    const longToken  = longData.access_token;
    const expiresIn  = longData.expires_in ?? 60 * 24 * 60 * 60; // default 60 days
    const expiresAt  = new Date(Date.now() + expiresIn * 1000);

    // 3. WhatsApp Business Accounts für diesen User
    const wabaRes = await fetch(
      `${GRAPH}/me/businesses?fields=id,name,whatsapp_business_accounts&access_token=${longToken}`
    );
    const wabaData = await wabaRes.json() as {
      data?: Array<{
        id: string;
        name: string;
        whatsapp_business_accounts?: { data?: Array<{ id: string; name?: string }> };
      }>;
    };

    let wabaId: string | null = null;
    let wabaName: string | null = null;
    let phoneNumberId: string | null = null;
    let phoneNumber: string | null = null;

    // Ersten WABA + erste Phone Number nehmen
    for (const biz of wabaData.data ?? []) {
      for (const waba of biz.whatsapp_business_accounts?.data ?? []) {
        wabaId   = waba.id;
        wabaName = waba.name ?? null;

        // Phone Numbers in diesem WABA
        const phoneRes = await fetch(
          `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number&access_token=${longToken}`
        );
        const phoneData = await phoneRes.json() as {
          data?: Array<{ id: string; display_phone_number: string }>;
        };

        const firstPhone = phoneData.data?.[0];
        if (firstPhone) {
          phoneNumberId = firstPhone.id;
          phoneNumber   = firstPhone.display_phone_number;
        }
        break; // erste WABA reicht
      }
      if (wabaId) break;
    }

    // Fallback: direkt über /me/whatsapp_business_accounts versuchen
    if (!wabaId) {
      const directRes = await fetch(
        `${GRAPH}/me/whatsapp_business_accounts?access_token=${longToken}`
      );
      const directData = await directRes.json() as {
        data?: Array<{ id: string; name?: string }>;
      };
      const firstWaba = directData.data?.[0];
      if (firstWaba) {
        wabaId   = firstWaba.id;
        wabaName = firstWaba.name ?? null;

        const phoneRes = await fetch(
          `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number&access_token=${longToken}`
        );
        const phoneData = await phoneRes.json() as {
          data?: Array<{ id: string; display_phone_number: string }>;
        };
        const firstPhone = phoneData.data?.[0];
        if (firstPhone) {
          phoneNumberId = firstPhone.id;
          phoneNumber   = firstPhone.display_phone_number;
        }
      }
    }

    // 4. In DB speichern
    await prisma.integration.upsert({
      where: { type: "whatsapp" },
      create: {
        type:        "whatsapp",
        accessToken: longToken,
        expiresAt,
        config: JSON.stringify({
          phoneNumberId,
          phoneNumber,
          wabaId,
          wabaName,
        }),
      },
      update: {
        accessToken: longToken,
        expiresAt,
        config: JSON.stringify({
          phoneNumberId,
          phoneNumber,
          wabaId,
          wabaName,
        }),
      },
    });

    const successParam = phoneNumberId ? "success" : "success_partial";
    return NextResponse.redirect(`${base}/settings?meta=${successParam}`);
  } catch (err) {
    console.error("Meta callback error:", err);
    return NextResponse.redirect(`${base}/settings?meta=error`);
  }
}
