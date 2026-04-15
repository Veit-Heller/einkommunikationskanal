import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// iCal string escaping per RFC 5545
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Format datetime as UTC: 20260415T080000Z
function fmtDT(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Format date only: 20260415
function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

// RFC 5545: fold lines longer than 75 chars with CRLF + space
function fold(line: string): string {
  if (line.length <= 75) return line;
  let out = "";
  while (line.length > 75) {
    out += line.slice(0, 75) + "\r\n ";
    line = line.slice(75);
  }
  return out + line;
}

const TYPE_EMOJI: Record<string, string> = {
  call:    "📞",
  email:   "✉️",
  meeting: "👥",
  todo:    "✅",
};

// A task is "all-day" if it was saved without a time (UTC midnight)
function isAllDay(date: Date): boolean {
  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
}

export async function GET() {
  try {
    const tasks = await prisma.followUp.findMany({
      where: { completed: false },
      include: {
        contact: {
          select: { firstName: true, lastName: true, company: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const now = new Date();

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Stevies CRM//Aufgaben//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:CRM Aufgaben",
      "X-WR-CALDESC:Alle offenen Aufgaben aus Stevies CRM",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
    ];

    for (const task of tasks) {
      const due = task.dueDate;
      const allDay = isAllDay(due);

      const contactName =
        [task.contact.firstName, task.contact.lastName]
          .filter(Boolean)
          .join(" ") ||
        task.contact.company ||
        "Kontakt";

      const emoji = TYPE_EMOJI[task.type] ?? "📋";
      const summary = `${emoji} ${task.title} – ${contactName}`;

      // End time: +1h for timed events, next day for all-day
      const endDate = new Date(due);
      if (allDay) {
        endDate.setUTCDate(endDate.getUTCDate() + 1);
      } else {
        endDate.setUTCHours(endDate.getUTCHours() + 1);
      }

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:task-${task.id}@stevies-crm`);
      lines.push(`DTSTAMP:${fmtDT(now)}`);
      lines.push(`CREATED:${fmtDT(task.createdAt)}`);
      lines.push(`LAST-MODIFIED:${fmtDT(task.updatedAt)}`);

      if (allDay) {
        lines.push(`DTSTART;VALUE=DATE:${fmtDate(due)}`);
        lines.push(`DTEND;VALUE=DATE:${fmtDate(endDate)}`);
      } else {
        lines.push(`DTSTART:${fmtDT(due)}`);
        lines.push(`DTEND:${fmtDT(endDate)}`);
      }

      lines.push(fold(`SUMMARY:${esc(summary)}`));

      const descParts: string[] = [];
      if (task.notes) descParts.push(task.notes);
      descParts.push(`Kontakt: ${contactName}`);
      lines.push(fold(`DESCRIPTION:${esc(descParts.join("\\n"))}`));

      lines.push("STATUS:CONFIRMED");
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    // iCal requires CRLF line endings
    const ical = lines.join("\r\n");

    return new NextResponse(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="crm-aufgaben.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/calendar/ical error:", error);
    return new NextResponse("Fehler beim Generieren des Kalender-Feeds", {
      status: 500,
    });
  }
}
