import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      overdueTasks,
      tasksToday,
      vorgaengeOpen,
      vorgaengeEingereicht,
      vorgaengeAbgeschlossen,
      inboundMessagesCount,
      newContactsCount,
      totalContacts,
      recentMessages,
      recentTasks,
      recentVorgaenge,
    ] = await Promise.all([
      // Überfällige Aufgaben
      prisma.followUp.findMany({
        where: { completed: false, dueDate: { lt: todayStart } },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      // Aufgaben heute
      prisma.followUp.findMany({
        where: { completed: false, dueDate: { gte: todayStart, lt: todayEnd } },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      // Offene Vorgänge
      prisma.vorgang.findMany({
        where: { status: "offen" },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      // Eingereichte Vorgänge
      prisma.vorgang.findMany({
        where: { status: "eingereicht" },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      // Abgeschlossene Vorgänge diesen Monat
      prisma.vorgang.count({
        where: { status: "abgeschlossen", updatedAt: { gte: monthStart } },
      }),
      // Eingehende Nachrichten gesamt
      prisma.message.count({ where: { direction: "inbound" } }),
      // Neue Kontakte diesen Monat
      prisma.contact.count({ where: { createdAt: { gte: monthStart } } }),
      // Kontakte gesamt
      prisma.contact.count(),
      // Letzte Nachrichten für Activity Feed
      prisma.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
      }),
      // Letzte Aufgaben für Activity Feed
      prisma.followUp.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
      }),
      // Letzte Vorgang-Aktivität für Activity Feed
      prisma.vorgang.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    // Activity Feed zusammenbauen
    const activityFeed = [
      ...recentMessages.map((m) => ({
        type: "message" as const,
        id: m.id,
        at: m.createdAt,
        contactName: [m.contact.firstName, m.contact.lastName].filter(Boolean).join(" "),
        contactId: m.contact.id,
        label: m.direction === "inbound" ? "Nachricht erhalten" : "Nachricht gesendet",
        channel: m.channel,
        direction: m.direction,
        content: m.content?.slice(0, 60) || m.subject || "",
      })),
      ...recentTasks.map((t) => ({
        type: "task" as const,
        id: t.id,
        at: t.completedAt || t.updatedAt,
        contactName: [t.contact.firstName, t.contact.lastName].filter(Boolean).join(" "),
        contactId: t.contact.id,
        label: t.completed ? "Aufgabe erledigt" : "Aufgabe erstellt",
        content: t.title,
        completed: t.completed,
      })),
      ...recentVorgaenge.map((v) => ({
        type: "vorgang" as const,
        id: v.id,
        at: v.updatedAt,
        contactName: [v.contact.firstName, v.contact.lastName].filter(Boolean).join(" "),
        contactId: v.contact.id,
        label: v.status === "abgeschlossen"
          ? "Vorgang abgeschlossen"
          : v.status === "eingereicht"
          ? "Vorgang eingereicht"
          : "Vorgang aktualisiert",
        content: v.title,
        status: v.status,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);

    return NextResponse.json({
      overdueTasks,
      tasksToday,
      vorgaengeOpen,
      vorgaengeEingereicht,
      vorgaengeAbgeschlossenThisMonth: vorgaengeAbgeschlossen,
      inboundMessagesCount,
      newContactsCount,
      totalContacts,
      activityFeed,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
