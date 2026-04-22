import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const row = await prisma.integration.findUnique({ where: { type: "profile" } });
    const profile = row?.config
      ? JSON.parse(row.config)
      : { name: "", role: "", company: "", logoUrl: null };
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: { name: "", role: "", company: "" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, company } = body;

    // Preserve logoUrl when saving profile text fields
    const row = await prisma.integration.findUnique({ where: { type: "profile" } });
    const existing = row?.config ? JSON.parse(row.config) : {};
    const updated = { ...existing, name, role, company };

    await prisma.integration.upsert({
      where: { type: "profile" },
      create: { type: "profile", config: JSON.stringify(updated) },
      update: { config: JSON.stringify(updated) },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("POST /api/settings/profile error:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
