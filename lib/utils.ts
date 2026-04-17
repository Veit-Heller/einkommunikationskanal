import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

/** Returns a display name for a contact, falling back to company or "Unbekannt". */
export function contactName(c: {
  firstName: string | null;
  lastName: string | null;
  company?: string | null;
}): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "Unbekannt";
}

/** Returns a human-readable due-date string, e.g. "Heute · 14:00 Uhr" */
export function formatDue(date: Date): string {
  const allDay = date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
  const timeSuffix = allDay ? "" : ` · ${format(date, "HH:mm")} Uhr`;

  if (isPast(date) && !isToday(date))
    return `Seit ${formatDistanceToNow(date, { locale: de })}${timeSuffix}`;
  if (isToday(date)) return `Heute${timeSuffix}`;
  if (isTomorrow(date)) return `Morgen${timeSuffix}`;
  return format(date, "EEE, d. MMM", { locale: de }) + timeSuffix;
}
