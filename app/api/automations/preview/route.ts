import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;

function nextCronRun(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(6, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export async function GET() {
  try {
    // All open Vorgänge — whether link sent or not
    const vorgaenge = await prisma.vorgang.findMany({
      where: { status: "offen" },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const now = Date.now();
    const cron = nextCronRun();

    type PipelineEntry = {
      id: string;
      title: string;
      contact: { id: string; firstName: string | null; lastName: string | null; company: string | null };
      reminderCount: number;
      filesCount: number;
      portalSentAt: Date | null;
      lastReminderAt: Date | null;
      lastActivityAt: Date | null;
      // "unsent"   = link never sent
      // "partial"  = customer has uploaded files but not yet submitted → reminders paused
      // "scheduled" = waiting for reminder threshold
      // "due"      = fires at next cron
      // "maxed"    = 2 reminders already sent, no more automation
      state: "unsent" | "partial" | "scheduled" | "due" | "maxed";
      firesAt: Date | null;
      daysUntil: number;
      label: string;
    };

    const pipeline: PipelineEntry[] = [];

    for (const v of vorgaenge) {
      const filesCount = (() => {
        try { return (JSON.parse(v.files || "[]") as unknown[]).length; } catch { return 0; }
      })();

      // Case 1: link never sent → waiting for broker action
      if (!v.portalSentAt) {
        pipeline.push({
          id: v.id,
          title: v.title,
          contact: v.contact,
          reminderCount: 0,
          filesCount,
          portalSentAt: null,
          lastReminderAt: null,
          lastActivityAt: v.lastActivityAt,
          state: "unsent",
          firesAt: null,
          daysUntil: 0,
          label: "Link noch nicht gesendet",
        });
        continue;
      }

      // Case 2: customer has uploaded files but not yet submitted → reminders paused
      if (filesCount > 0) {
        pipeline.push({
          id: v.id,
          title: v.title,
          contact: v.contact,
          reminderCount: v.reminderCount,
          filesCount,
          portalSentAt: v.portalSentAt,
          lastReminderAt: v.lastReminderAt,
          lastActivityAt: v.lastActivityAt,
          state: "partial",
          firesAt: null,
          daysUntil: 0,
          label: `${filesCount} Datei${filesCount !== 1 ? "en" : ""} hochgeladen — wartet auf Abgabe`,
        });
        continue;
      }

      // Case 3: max reminders reached → no more automation
      if (v.reminderCount >= 2) {
        pipeline.push({
          id: v.id,
          title: v.title,
          contact: v.contact,
          reminderCount: v.reminderCount,
          filesCount,
          portalSentAt: v.portalSentAt,
          lastReminderAt: v.lastReminderAt,
          lastActivityAt: v.lastActivityAt,
          state: "maxed",
          firesAt: null,
          daysUntil: 0,
          label: "Keine weiteren Auto-Erinnerungen (max. 2 erreicht)",
        });
        continue;
      }

      // Case 4: link sent, no files, reminders remaining → calculate when next fires
      let thresholdAt: Date;
      let nextLabel: string;

      if (v.reminderCount === 0) {
        thresholdAt = new Date(v.portalSentAt.getTime() + THREE_DAYS_MS);
        nextLabel = "1. Erinnerung";
      } else {
        if (!v.lastReminderAt) continue;
        thresholdAt = new Date(v.lastReminderAt.getTime() + FOUR_DAYS_MS);
        nextLabel = "2. Erinnerung";
      }

      const isDue = thresholdAt.getTime() <= now;

      let firesAt: Date | null;
      if (isDue) {
        firesAt = cron;
      } else {
        const tentative = new Date(thresholdAt);
        tentative.setUTCHours(6, 0, 0, 0);
        if (tentative < thresholdAt) tentative.setUTCDate(tentative.getUTCDate() + 1);
        firesAt = tentative;
      }

      const daysUntil = firesAt
        ? Math.max(0, Math.ceil((firesAt.getTime() - now) / (1000 * 60 * 60 * 24)))
        : 0;

      pipeline.push({
        id: v.id,
        title: v.title,
        contact: v.contact,
        reminderCount: v.reminderCount,
        filesCount,
        portalSentAt: v.portalSentAt,
        lastReminderAt: v.lastReminderAt,
        lastActivityAt: v.lastActivityAt,
        state: isDue ? "due" : "scheduled",
        firesAt,
        daysUntil,
        label: nextLabel,
      });
    }

    // Sort: unsent → partial (active!) → due → scheduled → maxed
    const order = { unsent: 0, partial: 1, due: 2, scheduled: 3, maxed: 4 };
    pipeline.sort((a, b) => {
      const diff = order[a.state] - order[b.state];
      if (diff !== 0) return diff;
      return (a.firesAt?.getTime() ?? 0) - (b.firesAt?.getTime() ?? 0);
    });

    return NextResponse.json({
      pipeline,
      nextCronRun: cron.toISOString(),
      totalWatching: pipeline.length,
    });
  } catch (error) {
    console.error("GET /api/automations/preview error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
