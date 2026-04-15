import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const vorgang = await prisma.vorgang.findUnique({
      where: { token: params.token },
    });

    if (!vorgang) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const { checklist } = body;

    await prisma.vorgang.update({
      where: { id: vorgang.id },
      data: {
        status: "eingereicht",
        checklist: checklist ? JSON.stringify(checklist) : vorgang.checklist,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/portal/[token]/submit error:", error);
    return NextResponse.json({ error: "Fehler beim Einreichen" }, { status: 500 });
  }
}
