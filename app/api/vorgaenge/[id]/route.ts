import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCompletionMessage } from "@/lib/vorgaenge";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description, checklist, status, dueDate } = body;

    // Fetch previous status to detect transition to "abgeschlossen"
    const previous = await prisma.vorgang.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (checklist !== undefined) data.checklist = JSON.stringify(checklist);
    if (body.brokerTodos !== undefined) (data as Record<string, unknown>).brokerTodos = JSON.stringify(body.brokerTodos);

    const vorgang = await prisma.vorgang.update({
      where: { id: params.id },
      data,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    // Trigger completion message when broker marks as abgeschlossen
    if (
      status === "abgeschlossen" &&
      previous?.status !== "abgeschlossen"
    ) {
      sendCompletionMessage(params.id).catch(err =>
        console.error("sendCompletionMessage failed:", err)
      );
    }

    return NextResponse.json({ vorgang });
  } catch (error) {
    console.error("PATCH /api/vorgaenge/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.vorgang.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vorgaenge/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
