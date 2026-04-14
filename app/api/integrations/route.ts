import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const integrations = await prisma.integration.findMany();

    const sanitized = integrations.map((i) => ({
      id: i.id,
      type: i.type,
      connected: !!i.accessToken,
      expiresAt: i.expiresAt,
      updatedAt: i.updatedAt,
      config: i.config ? JSON.parse(i.config) : null,
    }));

    // Gmail uses env vars — add status based on environment
    if (!sanitized.find((i) => i.type === "gmail")) {
      sanitized.push({
        id: "gmail-env",
        type: "gmail",
        connected: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
        expiresAt: null,
        updatedAt: new Date(),
        config: null,
      });
    }

    return NextResponse.json({ integrations: sanitized });
  } catch (error) {
    console.error("GET /api/integrations error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Integrationen" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config } = body;

    if (!type) {
      return NextResponse.json(
        { error: "type ist erforderlich" },
        { status: 400 }
      );
    }

    // For WhatsApp: save config (Phone Number ID, etc.)
    const integration = await prisma.integration.upsert({
      where: { type },
      create: {
        type,
        config: config ? JSON.stringify(config) : null,
      },
      update: {
        config: config ? JSON.stringify(config) : null,
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("POST /api/integrations error:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Integration" },
      { status: 500 }
    );
  }
}
