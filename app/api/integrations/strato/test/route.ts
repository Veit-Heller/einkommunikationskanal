import { NextRequest, NextResponse } from "next/server";
import { testStratoConnection } from "@/lib/strato";

export const dynamic = "force-dynamic";

// POST — IMAP + SMTP Verbindungstest
export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      imapServer = "imap.strato.de",
      imapPort   = 993,
      smtpServer = "smtp.strato.de",
      smtpPort   = 465,
    } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort erforderlich." }, { status: 400 });
    }

    const result = await testStratoConnection(email, password, smtpServer, smtpPort, imapServer, imapPort);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/integrations/strato/test error:", error);
    return NextResponse.json({ smtp: false, imap: false, smtpError: String(error) }, { status: 500 });
  }
}
