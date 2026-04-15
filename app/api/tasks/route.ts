import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const completed = searchParams.get("completed");

    const tasks = await prisma.followUp.findMany({
      where: {
        ...(contactId ? { contactId } : {}),
        ...(completed !== null ? { completed: completed === "true" } : {}),
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Aufgaben" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, title, dueDate, type, notes } = body;

    if (!contactId || !title || !dueDate) {
      return NextResponse.json(
        { error: "contactId, title und dueDate sind erforderlich" },
        { status: 400 }
      );
    }

    const task = await prisma.followUp.create({
      data: {
        contactId,
        title,
        dueDate: new Date(dueDate),
        type: type || "todo",
        notes: notes || null,
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen der Aufgabe" }, { status: 500 });
  }
}
