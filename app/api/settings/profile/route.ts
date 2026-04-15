import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "profile" } });
    const profile = row?.config ? JSON.parse(row.config) : { name: "", role: "", company: "" };
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: { name: "", role: "", company: "" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, company } = body;

    await prisma.integration.upsert({
      where: { type: "profile" },
      create: { type: "profile", config: JSON.stringify({ name, role, company }) },
      update: { config: JSON.stringify({ name, role, company }) },
    });

    return NextResponse.json({ success: true, profile: { name, role, company } });
  } catch (error) {
    console.error("POST /api/settings/profile error:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
