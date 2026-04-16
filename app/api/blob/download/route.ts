import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/blob/download?url=<private-blob-url>
// Fetches the private blob server-side (using the token) and streams it to the browser.
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
    // Fetch the private blob server-side using the read/write token
    const blobRes = await fetch(url, {
      headers: { Authorization: `Bearer ${blobToken}` },
    });

    if (!blobRes.ok) {
      console.error("Blob fetch failed:", blobRes.status, url);
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
    }

    // Extract filename from the URL path
    const rawName = url.split("/").pop()?.split("?")[0] ?? "download";
    const filename = decodeURIComponent(rawName);

    const contentType =
      blobRes.headers.get("content-type") || "application/octet-stream";
    const contentLength = blobRes.headers.get("content-length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    return new NextResponse(blobRes.body, { headers });
  } catch (error) {
    console.error("GET /api/blob/download error:", error);
    return NextResponse.json({ error: "Download fehlgeschlagen" }, { status: 500 });
  }
}
