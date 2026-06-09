import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search  = searchParams.get("search")  || "";
    const groupId = searchParams.get("groupId") || "";

    const parts = search.trim().split(/\s+/).filter(Boolean);

    // Build search filter
    const searchFilter = search
      ? parts.length >= 2
        ? {
            OR: [
              {
                AND: [
                  { firstName: { contains: parts[0], mode: "insensitive" as const } },
                  { lastName:  { contains: parts.slice(1).join(" "), mode: "insensitive" as const } },
                ],
              },
              {
                AND: [
                  { firstName: { contains: parts.slice(1).join(" "), mode: "insensitive" as const } },
                  { lastName:  { contains: parts[0], mode: "insensitive" as const } },
                ],
              },
              { company: { contains: search, mode: "insensitive" as const } },
              { email:   { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName:  { contains: search, mode: "insensitive" as const } },
              { email:     { contains: search, mode: "insensitive" as const } },
              { company:   { contains: search, mode: "insensitive" as const } },
              { phone:     { contains: search } },
            ],
          }
      : {};

    const where = {
      ...(groupId ? { groups: { some: { groupId } } } : {}),
      ...searchFilter,
    };

    const contacts = await prisma.contact.findMany({
      where,
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
        groups: {
          select: {
            group: { select: { id: true, name: true, color: true, emoji: true } },
          },
        },
      },
    });

    // Sort: 1) last message descending, 2) open Vorgänge descending, 3) createdAt descending
    contacts.sort((a, b) => {
      const aMsg = a.messages?.[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
      const bMsg = b.messages?.[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
      if (bMsg !== aMsg) return bMsg - aMsg;

      const aVorg = a._count?.vorgaenge ?? 0;
      const bVorg = b._count?.vorgaenge ?? 0;
      if (bVorg !== aVorg) return bVorg - aVorg;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
        firstName:    body.firstName    || null,
        lastName:     body.lastName     || null,
        email:        body.email        || null,
        phone:        normalizePhone(body.phone),
        company:      body.company      || null,
        notes:        body.notes        || null,
        birthday:     body.birthday ? new Date(body.birthday) : null,
        customFields: body.customFields ? JSON.stringify(body.customFields) : null,
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
