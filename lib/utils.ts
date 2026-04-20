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

/**
 * Normalize a German phone number to E.164 format (+49XXXXXXXXX).
 * Returns null if the number can't be recognized.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[\s\-().\/]/g, "");
  if (!digits) return null;

  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0049")) digits = digits.slice(4);
  if (digits.startsWith("490")) digits = "49" + digits.slice(3); // +490162 → +4916
  if (digits.startsWith("0")) digits = "49" + digits.slice(1);
  if (!digits.startsWith("49")) return null;
  if (digits.length < 10 || digits.length > 14) return null;

  return "+" + digits;
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
