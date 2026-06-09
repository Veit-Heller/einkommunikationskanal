import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, color, emoji, description, filter } = body;

    const group = await prisma.contactGroup.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(emoji !== undefined && { emoji }),
        ...(description !== undefined && { description }),
        ...(filter !== undefined && { filter: filter ? JSON.stringify(filter) : null }),
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("PATCH /api/groups/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contactGroup.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/groups/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
