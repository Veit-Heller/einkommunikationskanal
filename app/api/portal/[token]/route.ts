import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const vorgang = await prisma.vorgang.findUnique({
      where: { token: params.token },
      include: {
        contact: { select: { firstName: true, lastName: true, company: true } },
      },
    });

    if (!vorgang) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    // Load broker profile for branding
    const profileRow = await prisma.integration.findUnique({ where: { type: "profile" } });
    const profile = profileRow?.config ? JSON.parse(profileRow.config) : {};

    return NextResponse.json({
      vorgang: {
        ...vorgang,
        checklist: JSON.parse(vorgang.checklist),
        files: JSON.parse(vorgang.files),
      },
      profile,
    });
  } catch (error) {
    console.error("GET /api/portal/[token] error:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
