import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description, checklist, status } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (checklist !== undefined) data.checklist = JSON.stringify(checklist);

    const vorgang = await prisma.vorgang.update({
      where: { id: params.id },
      data,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

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
