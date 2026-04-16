import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Returns counts of Vorgänge by status for sidebar badge
export async function GET() {
  try {
    const [offen, eingereicht] = await Promise.all([
      prisma.vorgang.count({ where: { status: "offen" } }),
      prisma.vorgang.count({ where: { status: "eingereicht" } }),
    ]);
    return NextResponse.json({ offen, eingereicht, total: offen + eingereicht });
  } catch (error) {
    console.error("GET /api/vorgaenge/count error:", error);
    return NextResponse.json({ offen: 0, eingereicht: 0, total: 0 });
  }
}
