import { NextRequest, NextResponse } from "next/server";

// Routes that are publicly accessible without login
const PUBLIC_PREFIXES = [
  "/portal/",
  "/api/portal/",
  "/login",
  "/api/auth/",
  "/_next/",
  "/favicon",
];

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // No secret configured — allow through (misconfiguration, not a security issue in dev)
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("crm_session")?.value;
  const expected = await computeSessionToken(secret);

  if (sessionCookie !== expected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files.
     * Portal and login are handled by PUBLIC_PREFIXES above.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
