import { NextRequest, NextResponse } from "next/server";
import { getOutlookAuthUrl, isOutlookConfigured } from "@/lib/outlook";

export async function GET() {
  try {
    if (!isOutlookConfigured()) {
      return NextResponse.json(
        {
          error:
            "Outlook-App-Credentials nicht konfiguriert. Bitte OUTLOOK_CLIENT_ID und OUTLOOK_CLIENT_SECRET in .env.local setzen.",
        },
        { status: 400 }
      );
    }

    const authUrl = getOutlookAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("GET /api/integrations/outlook error:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren der Auth-URL" },
      { status: 500 }
    );
  }
}
