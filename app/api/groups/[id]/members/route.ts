import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: add contacts to group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { contactIds, addedBy = "manual" } = await request.json();

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "contactIds erforderlich" }, { status: 400 });
    }

    // Upsert all (skip already existing members)
    await prisma.contactsOnGroup.createMany({
      data: contactIds.map((contactId: string) => ({
        contactId,
        groupId: params.id,
        addedBy,
      })),
      skipDuplicates: true,
    });

    const count = await prisma.contactsOnGroup.count({ where: { groupId: params.id } });
    return NextResponse.json({ ok: true, memberCount: count });
  } catch (error) {
    console.error("POST /api/groups/[id]/members error:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

// DELETE: remove contacts from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { contactIds } = await request.json();

    await prisma.contactsOnGroup.deleteMany({
      where: {
        groupId: params.id,
        contactId: { in: contactIds },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/groups/[id]/members error:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
