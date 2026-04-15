import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const products = await prisma.insuranceProduct.findMany({
      where: { contactId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET /api/contacts/[id]/products error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { type, status, fields, notes } = body;

    if (!type) {
      return NextResponse.json({ error: "type ist erforderlich" }, { status: 400 });
    }

    const product = await prisma.insuranceProduct.create({
      data: {
        contactId: params.id,
        type,
        status: status || "interessent",
        fields: fields ? JSON.stringify(fields) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contacts/[id]/products error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
