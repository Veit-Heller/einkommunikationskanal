import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderMessage } from "@/lib/vorgaenge";

export async function POST(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vorgang = await prisma.vorgang.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });

    if (!vorgang) {
      return NextResponse.json({ error: "Vorgang nicht gefunden" }, { status: 404 });
    }

    if (vorgang.status === "abgeschlossen") {
      return NextResponse.json(
        { error: "Vorgang ist bereits abgeschlossen" },
        { status: 400 }
      );
    }

    await sendReminderMessage(params.id);

    const updated = await prisma.vorgang.findUnique({
      where: { id: params.id },
      select: { reminderCount: true, lastReminderAt: true },
    });

    return NextResponse.json({
      success: true,
      reminderCount: updated?.reminderCount,
      lastReminderAt: updated?.lastReminderAt,
    });
  } catch (error) {
    console.error("POST /api/vorgaenge/[id]/remind error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erinnerung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
