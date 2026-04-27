import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const integration = await prisma.integration.findUnique({ where: { type: "whatsapp" } });
  if (!integration) return NextResponse.json({ error: "no integration found" });

  const cfg = integration.config ? JSON.parse(integration.config) : {};
  const phoneNumberId = cfg.phoneNumberId;
  const accessToken   = integration.accessToken;

  // 1. Phone number status
  const statusRes = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,last_onboarded_time`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const statusData = await statusRes.json();

  // 2. Try register
  const registerRes = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/register`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", pin: "000000" }),
    }
  );
  const registerData = await registerRes.json();

  return NextResponse.json({
    phoneNumberId,
    status: statusData,
    register: { ok: registerRes.ok, data: registerData },
  });
}
