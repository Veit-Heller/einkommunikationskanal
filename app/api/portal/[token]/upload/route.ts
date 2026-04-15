import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const vorgang = await prisma.vorgang.findUnique({
      where: { token: params.token },
    });

    if (!vorgang) {
      return NextResponse.json({ error: "Vorgang nicht gefunden" }, { status: 404 });
    }

    if (vorgang.status === "abgeschlossen") {
      return NextResponse.json({ error: "Vorgang bereits abgeschlossen" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`portal/${vorgang.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Add to files list
    const files = JSON.parse(vorgang.files || "[]");
    const newFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      url: blob.url,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    files.push(newFile);

    await prisma.vorgang.update({
      where: { id: vorgang.id },
      data: { files: JSON.stringify(files) },
    });

    return NextResponse.json({ file: newFile });
  } catch (error) {
    console.error("POST /api/portal/[token]/upload error:", error);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}
