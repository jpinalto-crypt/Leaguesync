import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type");
  const contentLength = req.headers.get("content-length");

  let rawText = "";
  try {
    rawText = await req.text();
  } catch (e: any) {
    rawText = "ERROR reading body: " + e.message;
  }

  console.log("TEST IMPORT HIT");
  console.log("Content-Type:", contentType);
  console.log("Content-Length:", contentLength);
  console.log("Body length:", rawText.length);
  console.log("Body preview:", rawText.slice(0, 300));

  return NextResponse.json({
    success: true,
    contentType,
    contentLength,
    bodyLength: rawText.length,
    preview: rawText.slice(0, 200),
  });
}

export async function GET() {
  return NextResponse.json({ message: "Test import endpoint is alive" });
}