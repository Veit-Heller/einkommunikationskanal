import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderMessage } from "@/lib/vorgaenge";

export const dynamic = "force-dynamic";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Auth check — Vercel passes the CRON_SECRET automatically
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - THREE_DAYS_MS);
  const fourDaysAgo  = new Date(now.getTime() - FOUR_DAYS_MS);

  // Find Vorgänge that need a reminder:
  // - Status "offen"
  // - Portal link was sent (portalSentAt is not null)
  // - Max 2 auto-reminders
  // - Either: first reminder due (count=0 and >3 days without activity)
  //       Or: second reminder due (count=1 and >4 days since last reminder AND no recent activity)
  // → Never remind if the customer has been active recently (uploaded files).
  const candidates = await prisma.vorgang.findMany({
    where: {
      status: { in: ["offen", "teilweise"] },
      portalSentAt: { not: null },
      reminderCount: { lt: 2 },
      OR: [
        // First reminder: only if no activity in the past 3 days
        {
          reminderCount: 0,
          AND: [
            {
              OR: [
                { lastActivityAt: null },
                { lastActivityAt: { lt: threeDaysAgo } },
              ],
            },
            { portalSentAt: { lt: threeDaysAgo } },
          ],
        },
        // Second reminder: only if no activity in the past 4 days either
        {
          reminderCount: { gte: 1 },
          lastReminderAt: { lt: fourDaysAgo },
          OR: [
            { lastActivityAt: null },
            { lastActivityAt: { lt: fourDaysAgo } },
          ],
        },
      ],
    },
    select: { id: true, title: true },
  });

  const sent: string[] = [];
  const errors: string[] = [];

  for (const v of candidates) {
    try {
      await sendReminderMessage(v.id);
      sent.push(v.id);
      console.log(`[cron] Reminder sent for Vorgang "${v.title}" (${v.id})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${v.id}: ${msg}`);
      console.error(`[cron] Reminder failed for Vorgang ${v.id}:`, err);
    }
  }

  return NextResponse.json({
    sent: sent.length,
    errors: errors.length > 0 ? errors : undefined,
    checked: candidates.length,
    timestamp: now.toISOString(),
  });
}
