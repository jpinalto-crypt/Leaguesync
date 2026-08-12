import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = path ? "/" + path.join("/") : "";

  const contentType = req.headers.get("content-type");
  const contentLength = req.headers.get("content-length");

  let rawText = "";
  try {
    rawText = await req.text();
  } catch (e: any) {
    rawText = "ERROR reading body: " + e.message;
  }

  console.log("=== TEST IMPORT HIT ===");
  console.log("Path:", pathStr);
  console.log("Content-Type:", contentType);
  console.log("Content-Length:", contentLength);
  console.log("Body length:", rawText.length);
  console.log("Body preview:", rawText.slice(0, 500));

  return NextResponse.json({
    success: true,
    path: pathStr,
    contentType,
    bodyLength: rawText.length,
    preview: rawText.slice(0, 300),
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return NextResponse.json({
    message: "Test import catch-all is alive",
    path: path ? path.join("/") : "none",
  });
}