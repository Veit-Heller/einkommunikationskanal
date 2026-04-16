import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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

    const { fileId, name } = await request.json();
    if (!fileId || !name?.trim()) {
      return NextResponse.json({ error: "fileId und name erforderlich" }, { status: 400 });
    }

    const files = JSON.parse(vorgang.files || "[]");
    const idx = files.findIndex((f: { id: string }) => f.id === fileId);
    if (idx === -1) {
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
    }

    files[idx].name = name.trim();

    await prisma.vorgang.update({
      where: { id: vorgang.id },
      data: { files: JSON.stringify(files) },
    });

    return NextResponse.json({ success: true, file: files[idx] });
  } catch (error) {
    console.error("PATCH /api/portal/[token]/rename error:", error);
    return NextResponse.json({ error: "Umbenennen fehlgeschlagen" }, { status: 500 });
  }
}
