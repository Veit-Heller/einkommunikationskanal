import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await prisma.contactGroup.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ groups: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, emoji, description, filter } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const group = await prisma.contactGroup.create({
      data: {
        name: name.trim(),
        color: color || "#F2EAD3",
        emoji: emoji || null,
        description: description || null,
        filter: filter ? JSON.stringify(filter) : null,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
