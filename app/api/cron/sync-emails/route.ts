import { NextRequest, NextResponse } from "next/server";
import { syncGmailInbox, syncOutlookInbox } from "@/lib/email-sync";

/**
 * GET /api/cron/sync-emails
 * Wird alle 5 Minuten von Vercel Cron aufgerufen.
 * Holt neue eingehende E-Mails (Gmail + Outlook) und speichert sie als inbound Messages.
 */
export async function GET(request: NextRequest) {
  // Protect with CRON_SECRET (Vercel injects this automatically)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [gmailCount, outlookCount] = await Promise.allSettled([
      syncGmailInbox(),
      syncOutlookInbox(),
    ]);

    const gmail   = gmailCount.status   === "fulfilled" ? gmailCount.value   : 0;
    const outlook = outlookCount.status === "fulfilled" ? outlookCount.value : 0;

    if (gmailCount.status === "rejected") {
      console.error("[sync-emails] Gmail sync error:", gmailCount.reason);
    }
    if (outlookCount.status === "rejected") {
      console.error("[sync-emails] Outlook sync error:", outlookCount.reason);
    }

    console.log(`[sync-emails] Synced ${gmail} Gmail + ${outlook} Outlook messages`);

    return NextResponse.json({
      ok:      true,
      gmail,
      outlook,
      total:   gmail + outlook,
    });
  } catch (err) {
    console.error("[sync-emails] Unexpected error:", err);
    return NextResponse.json({ error: "Sync fehlgeschlagen" }, { status: 500 });
  }
}
