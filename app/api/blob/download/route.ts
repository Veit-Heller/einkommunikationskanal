import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";

export const dynamic = "force-dynamic";

// GET /api/blob/download?url=<blob-url>
// Generates a short-lived signed download URL for a private blob and redirects to it.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json({ error: "Storage nicht konfiguriert" }, { status: 500 });
  }

  try {
    const blob = await head(url, { token: blobToken });
    // blob.downloadUrl is a short-lived signed URL
    return NextResponse.redirect(blob.downloadUrl);
  } catch (error) {
    console.error("GET /api/blob/download error:", error);
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }
}
