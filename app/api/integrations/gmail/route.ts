import { NextResponse } from "next/server";
import { getGmailAuthUrl, isGmailConfigured } from "@/lib/gmail";

export async function GET() {
  try {
    if (!isGmailConfigured()) {
      return NextResponse.json(
        { error: "Gmail nicht konfiguriert. Bitte GMAIL_CLIENT_ID und GMAIL_CLIENT_SECRET setzen." },
        { status: 400 }
      );
    }

    const authUrl = getGmailAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("GET /api/integrations/gmail error:", error);
    return NextResponse.json({ error: "Fehler beim Generieren der Auth-URL" }, { status: 500 });
  }
}
