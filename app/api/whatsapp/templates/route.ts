import { NextResponse } from "next/server";
import { getWhatsAppTemplates } from "@/lib/whatsapp";

export async function GET() {
  try {
    const templates = await getWhatsAppTemplates();
    // Only return APPROVED templates
    const approved = templates.filter(t => t.status === "APPROVED");
    return NextResponse.json({ templates: approved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
