import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPortalLink } from "@/lib/vorgaenge";

export async function POST(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify vorgang exists first
    const vorgang = await prisma.vorgang.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!vorgang) {
      return NextResponse.json({ error: "Vorgang nicht gefunden" }, { status: 404 });
    }

    await sendPortalLink(params.id);

    const updated = await prisma.vorgang.findUnique({
      where: { id: params.id },
      select: { portalSentAt: true },
    });

    return NextResponse.json({ success: true, portalSentAt: updated?.portalSentAt });
  } catch (error) {
    console.error("POST /api/vorgaenge/[id]/send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Versand fehlgeschlagen" },
      { status: 500 }
    );
  }
}
