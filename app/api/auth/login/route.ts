import { NextRequest, NextResponse } from "next/server";

async function computeSessionToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("crm-session-v1"));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret        = process.env.NEXTAUTH_SECRET;

  if (!adminPassword || !secret) {
    return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const token = await computeSessionToken(secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("crm_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
