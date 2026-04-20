import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPortalLink } from "@/lib/vorgaenge";

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
    const { contactId, title, description, templateId, sendNow, dueDate } = body;

    if (!contactId || !title) {
      return NextResponse.json({ error: "contactId und title erforderlich" }, { status: 400 });
    }

    // Support both old format (checklist: string[]) and new format (customerTodos: {label, type}[])
    const rawTodos = body.customerTodos || body.checklist || [];
    const checklistData = rawTodos.map((item: string | { label: string; type?: string }, i: number) => {
      if (typeof item === "string") {
        return { id: `item-${i}-${Date.now()}`, label: item, type: "upload", status: "open", completedAt: null, fileId: null };
      }
      return { id: `item-${i}-${Date.now()}`, label: item.label, type: item.type || "upload", status: "open", completedAt: null, fileId: null };
    });

    const brokerTodosData = (body.brokerTodos || []).map((label: string, i: number) => ({
      id: `broker-${i}-${Date.now()}`,
      label,
      completed: false,
      completedAt: null,
    }));

    const vorgang = await prisma.vorgang.create({
      data: {
        contactId,
        title,
        description: description || null,
        templateId: templateId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        checklist: JSON.stringify(checklistData),
        brokerTodos: JSON.stringify(brokerTodosData) as any,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    // Auto-send portal link if requested
    let sendError: string | null = null;
    if (sendNow === true) {
      try {
        await sendPortalLink(vorgang.id);
      } catch (err) {
        console.error("sendPortalLink failed after create:", err);
        sendError = err instanceof Error ? err.message : "Versand fehlgeschlagen";
      }
    }

    return NextResponse.json(
      { vorgang, ...(sendError ? { sendError } : {}) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/vorgaenge error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
