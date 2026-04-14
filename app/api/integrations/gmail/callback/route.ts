import { NextRequest, NextResponse } from "next/server";

// OAuth callback no longer used — Gmail uses SMTP App Password via env vars
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/settings", request.url));
}
