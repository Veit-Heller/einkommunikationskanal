import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Kontakt nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("GET /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Kontakts" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if ("firstName" in body) updateData.firstName = body.firstName || null;
    if ("lastName" in body) updateData.lastName = body.lastName || null;
    if ("email" in body) updateData.email = body.email || null;
    if ("phone" in body) updateData.phone = normalizePhone(body.phone);
    if ("company" in body) updateData.company = body.company || null;
    if ("notes" in body) updateData.notes = body.notes || null;
    if ("customFields" in body) {
      updateData.customFields = body.customFields
        ? JSON.stringify(body.customFields)
        : null;
    }

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("PATCH /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Kontakts" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contact.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Kontakts" },
      { status: 500 }
    );
  }
}
