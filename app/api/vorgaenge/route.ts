import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    const vorgaenge = await prisma.vorgang.findMany({
      where: contactId ? { contactId } : {},
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ vorgaenge });
  } catch (error) {
    console.error("GET /api/vorgaenge error:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, title, description, checklist } = body;

    if (!contactId || !title) {
      return NextResponse.json({ error: "contactId und title erforderlich" }, { status: 400 });
    }

    const vorgang = await prisma.vorgang.create({
      data: {
        contactId,
        title,
        description: description || null,
        checklist: JSON.stringify(
          (checklist || []).map((label: string, i: number) => ({
            id: `item-${i}-${Date.now()}`,
            label,
            completed: false,
            completedAt: null,
          }))
        ),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    return NextResponse.json({ vorgang }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vorgaenge error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
