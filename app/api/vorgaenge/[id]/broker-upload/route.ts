import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vorgang = await prisma.vorgang.findUnique({ where: { id: params.id } });
    if (!vorgang) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

    const blob = await put(`broker/${params.id}/${file.name}`, file, { access: "public" });

    const existing: Array<{ id: string; name: string; url: string; size: number; uploadedAt: string }> =
      JSON.parse((vorgang as unknown as { brokerFiles: string }).brokerFiles || "[]");

    const newFile = {
      id: crypto.randomUUID(),
      name: file.name,
      url: blob.url,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.vorgang.update({
      where: { id: params.id },
      data: { brokerFiles: JSON.stringify([...existing, newFile]) } as any,
    });

    return NextResponse.json({ file: newFile });
  } catch (err) {
    console.error("[broker-upload] POST error:", err);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { fileId } = await req.json();
    const vorgang = await prisma.vorgang.findUnique({ where: { id: params.id } });
    if (!vorgang) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const existing: Array<{ id: string; name: string; url: string; size: number; uploadedAt: string }> =
      JSON.parse((vorgang as unknown as { brokerFiles: string }).brokerFiles || "[]");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.vorgang.update({
      where: { id: params.id },
      data: { brokerFiles: JSON.stringify(existing.filter((f) => f.id !== fileId)) } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[broker-upload] DELETE error:", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
