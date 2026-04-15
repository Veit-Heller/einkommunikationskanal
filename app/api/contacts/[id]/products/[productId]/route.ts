import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const body = await request.json();
    const { type, status, fields, notes } = body;

    const data: Record<string, unknown> = {};
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (fields !== undefined) data.fields = JSON.stringify(fields);
    if (notes !== undefined) data.notes = notes;

    const product = await prisma.insuranceProduct.update({
      where: { id: params.productId },
      data,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("PATCH /api/contacts/[id]/products/[productId] error:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    await prisma.insuranceProduct.delete({ where: { id: params.productId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/contacts/[id]/products/[productId] error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
