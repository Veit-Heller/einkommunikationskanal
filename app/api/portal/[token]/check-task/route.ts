import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { taskId } = await req.json();

    const vorgang = await prisma.vorgang.findUnique({ where: { token: params.token } });
    if (!vorgang) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const checklist = JSON.parse(vorgang.checklist) as Array<Record<string, unknown>>;
    const updated = checklist.map(item =>
      item.id === taskId
        ? { ...item, status: "pending_review", completedAt: new Date().toISOString() }
        : item
    );

    await prisma.vorgang.update({
      where: { token: params.token },
      data: {
        checklist: JSON.stringify(updated),
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[check-task] error:", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
