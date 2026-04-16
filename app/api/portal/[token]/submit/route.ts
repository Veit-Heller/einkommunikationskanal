import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBrokerTask, logSystemEvent, sendPartialConfirmation } from "@/lib/vorgaenge";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const vorgang = await prisma.vorgang.findUnique({
      where: { token: params.token },
    });

    if (!vorgang) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const checklist: Array<{ completed: boolean; label: string }> =
      body.checklist || JSON.parse(vorgang.checklist || "[]");

    // Determine if all required docs have been submitted
    const allCompleted =
      checklist.length === 0 ||
      checklist.every(item => item.completed);

    const newStatus = allCompleted ? "eingereicht" : "teilweise";

    await prisma.vorgang.update({
      where: { id: vorgang.id },
      data: {
        status: newStatus,
        lastActivityAt: new Date(),
        checklist: JSON.stringify(checklist),
      },
    });

    if (newStatus === "eingereicht") {
      // Full submission — broker task + system event
      createBrokerTask(vorgang.id).catch(err =>
        console.error("createBrokerTask failed:", err)
      );
      logSystemEvent(
        vorgang.contactId,
        `📨 Vollständig eingereicht: ${vorgang.title}`,
      ).catch(() => {});
    } else {
      // Partial submission — notify customer what's missing + broker system event
      sendPartialConfirmation(vorgang.id).catch(err =>
        console.error("sendPartialConfirmation failed:", err)
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("POST /api/portal/[token]/submit error:", error);
    return NextResponse.json({ error: "Fehler beim Einreichen" }, { status: 500 });
  }
}
