import { NextResponse } from "next/server";
import { isGmailConfigured } from "@/lib/gmail";

export async function GET() {
  return NextResponse.json({ configured: isGmailConfigured() });
}
