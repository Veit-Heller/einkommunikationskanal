import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATES } from "@/lib/vorgaenge";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await prisma.integration.findUnique({
      where: { type: "automation_templates" },
    });
    const saved = row?.config ? JSON.parse(row.config) : {};
    const templates = { ...DEFAULT_TEMPLATES, ...saved };
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("GET /api/automations/templates error:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { templates } = await request.json();
    await prisma.integration.upsert({
      where: { type: "automation_templates" },
      create: { type: "automation_templates", config: JSON.stringify(templates) },
      update: { config: JSON.stringify(templates) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/automations/templates error:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
