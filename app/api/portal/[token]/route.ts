import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeCustomerTodo(item: Record<string, unknown>) {
  return {
    id: item.id as string,
    label: item.label as string,
    type: (item.type as string) || "upload",
    status: (item.status as string) || ((item.completed as boolean) ? "done" : "open"),
    completedAt: (item.completedAt as string) || null,
    fileId: (item.fileId as string) || null,
  };
}

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
        checklist: (JSON.parse(vorgang.checklist) as Record<string, unknown>[]).map(normalizeCustomerTodo),
        files: JSON.parse(vorgang.files),
        brokerFiles: JSON.parse((vorgang as unknown as { brokerFiles: string }).brokerFiles || "[]"),
      },
      profile,
    });
  } catch (error) {
    console.error("GET /api/portal/[token] error:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
