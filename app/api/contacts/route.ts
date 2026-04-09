import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const contacts = await prisma.contact.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { company: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("GET /api/contacts error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kontakte" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const contact = await prisma.contact.create({
      data: {
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        email: body.email || null,
        phone: body.phone || null,
        company: body.company || null,
        notes: body.notes || null,
        customFields: body.customFields
          ? JSON.stringify(body.customFields)
          : null,
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contacts error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Kontakts" },
      { status: 500 }
    );
  }
}
