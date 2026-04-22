import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const parts = search.trim().split(/\s+/).filter(Boolean);

    const contacts = await prisma.contact.findMany({
      where: search
        ? parts.length >= 2
          ? {
              // "Veit Heller" → match firstName~parts[0] AND lastName~rest (or vice versa)
              OR: [
                {
                  AND: [
                    { firstName: { contains: parts[0], mode: "insensitive" } },
                    { lastName:  { contains: parts.slice(1).join(" "), mode: "insensitive" } },
                  ],
                },
                {
                  AND: [
                    { firstName: { contains: parts.slice(1).join(" "), mode: "insensitive" } },
                    { lastName:  { contains: parts[0], mode: "insensitive" } },
                  ],
                },
                { company: { contains: search, mode: "insensitive" } },
                { email:   { contains: search, mode: "insensitive" } },
              ],
            }
          : {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName:  { contains: search, mode: "insensitive" } },
                { email:     { contains: search, mode: "insensitive" } },
                { company:   { contains: search, mode: "insensitive" } },
                { phone:     { contains: search } },
              ],
            }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            vorgaenge: { where: { status: { not: "abgeschlossen" } } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
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
        phone: normalizePhone(body.phone),
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
