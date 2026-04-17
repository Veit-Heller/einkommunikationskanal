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
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("BLOB_READ_WRITE_TOKEN is not set");
      return NextResponse.json({ error: "Storage nicht konfiguriert" }, { status: 500 });
    }
    const blob = await put(`portal/${vorgang.id}/${Date.now()}-${file.name}`, file, {
      access: "private",
      token: blobToken,
    });

    // Add to files list
    const files = JSON.parse(vorgang.files || "[]");
    const newFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      url: blob.url,        // private blob pathname — download via /api/blob/download
      pathname: blob.pathname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    files.push(newFile);

    await prisma.vorgang.update({
      where: { id: vorgang.id },
      data: {
        files: JSON.stringify(files),
        lastActivityAt: new Date(),
      },
    });


    return NextResponse.json({ file: newFile });
  } catch (error) {
    console.error("POST /api/portal/[token]/upload error:", error);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}
