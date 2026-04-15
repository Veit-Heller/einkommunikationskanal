import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { completed, title, dueDate, type, notes } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (dueDate !== undefined) data.dueDate = new Date(dueDate);
    if (type !== undefined) data.type = type;
    if (notes !== undefined) data.notes = notes;
    if (completed !== undefined) {
      data.completed = completed;
      data.completedAt = completed ? new Date() : null;
    }

    const task = await prisma.followUp.update({
      where: { id: params.id },
      data,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.followUp.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
