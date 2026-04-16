import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBrokerTask, logSystemEvent } from "@/lib/vorgaenge";

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
    const { checklist } = body;

    await prisma.vorgang.update({
      where: { id: vorgang.id },
      data: {
        status: "eingereicht",
        lastActivityAt: new Date(),
        checklist: checklist ? JSON.stringify(checklist) : vorgang.checklist,
      },
    });

    // Create a follow-up task + system message for the broker
    createBrokerTask(vorgang.id).catch(err =>
      console.error("createBrokerTask failed:", err)
    );
    logSystemEvent(vorgang.contactId, `📨 Unterlagen eingereicht: ${vorgang.title}`).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/portal/[token]/submit error:", error);
    return NextResponse.json({ error: "Fehler beim Einreichen" }, { status: 500 });
  }
}
