import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?error=Kein+Autorisierungscode+erhalten", request.url)
    );
  }

  try {
    const tokenData = await exchangeCodeForToken(code);

    await prisma.integration.upsert({
      where: { type: "gmail" },
      create: {
        type: "gmail",
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || null,
        expiresAt: tokenData.expiresAt,
      },
      update: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || null,
        expiresAt: tokenData.expiresAt,
      },
    });

    return NextResponse.redirect(new URL("/settings?success=gmail", request.url));
  } catch (err) {
    console.error("Gmail token exchange error:", err);
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(
          err instanceof Error ? err.message : "Authentifizierung fehlgeschlagen"
        )}`,
        request.url
      )
    );
  }
}
