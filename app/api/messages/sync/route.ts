import { NextResponse } from "next/server";
import { syncGmailInbox, syncOutlookInbox, syncStratoInbox } from "@/lib/email-sync";

// POST /api/messages/sync — manueller E-Mail-Sync aus der UI
export async function POST() {
  try {
    const [gmail, outlook, strato] = await Promise.allSettled([
      syncGmailInbox(),
      syncOutlookInbox(),
      syncStratoInbox(),
    ]);

    return NextResponse.json({
      ok: true,
      gmail:   gmail.status   === "fulfilled" ? gmail.value   : 0,
      outlook: outlook.status === "fulfilled" ? outlook.value : 0,
      strato:  strato.status  === "fulfilled" ? strato.value  : 0,
    });
  } catch (error) {
    console.error("POST /api/messages/sync error:", error);
    return NextResponse.json({ error: "Sync fehlgeschlagen" }, { status: 500 });
  }
}
