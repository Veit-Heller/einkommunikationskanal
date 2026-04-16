import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;

function nextCronRun(): Date {
  // Cron runs daily at 06:00 UTC
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(6, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export async function GET() {
  try {
    // All open Vorgänge that have a portal link sent and < 2 reminders
    const vorgaenge = await prisma.vorgang.findMany({
      where: {
        status: "offen",
        portalSentAt: { not: null },
        reminderCount: { lt: 2 },
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
      },
      orderBy: { portalSentAt: "asc" },
    });

    const now = Date.now();
    const cron = nextCronRun();

    type PipelineEntry = {
      id: string;
      title: string;
      contact: { id: string; firstName: string | null; lastName: string | null; company: string | null };
      reminderCount: number;
      portalSentAt: Date | null;
      lastReminderAt: Date | null;
      nextActionAt: Date;       // when threshold is crossed
      firesAt: Date | null;     // next cron run after threshold
      isDue: boolean;           // would fire if cron ran right now
      daysUntil: number;
    };

    const pipeline: PipelineEntry[] = [];

    for (const v of vorgaenge) {
      let thresholdAt: Date;

      if (v.reminderCount === 0) {
        // First reminder: portalSentAt + 3 days
        thresholdAt = new Date(v.portalSentAt!.getTime() + THREE_DAYS_MS);
      } else {
        // Second reminder: lastReminderAt + 4 days
        if (!v.lastReminderAt) continue;
        thresholdAt = new Date(v.lastReminderAt.getTime() + FOUR_DAYS_MS);
      }

      // Also check lastActivityAt — if client was active, no reminder
      if (v.lastActivityAt) {
        const activityAge = now - v.lastActivityAt.getTime();
        if (v.reminderCount === 0 && activityAge < THREE_DAYS_MS) continue;
      }

      const isDue = thresholdAt.getTime() <= now;

      // Next cron run after threshold
      let firesAt: Date | null = null;
      if (isDue) {
        firesAt = cron;
      } else {
        // Find cron run after threshold
        const tentative = new Date(thresholdAt);
        tentative.setUTCHours(6, 0, 0, 0);
        if (tentative < thresholdAt) tentative.setUTCDate(tentative.getUTCDate() + 1);
        firesAt = tentative;
      }

      const daysUntil = firesAt
        ? Math.ceil((firesAt.getTime() - now) / (1000 * 60 * 60 * 24))
        : 0;

      pipeline.push({
        id: v.id,
        title: v.title,
        contact: v.contact,
        reminderCount: v.reminderCount,
        portalSentAt: v.portalSentAt,
        lastReminderAt: v.lastReminderAt,
        nextActionAt: thresholdAt,
        firesAt,
        isDue,
        daysUntil: Math.max(0, daysUntil),
      });
    }

    // Sort: due first, then by firesAt ascending
    pipeline.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return (a.firesAt?.getTime() ?? 0) - (b.firesAt?.getTime() ?? 0);
    });

    return NextResponse.json({
      pipeline,
      nextCronRun: cron.toISOString(),
      totalWatching: vorgaenge.length,
    });
  } catch (error) {
    console.error("GET /api/automations/preview error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
