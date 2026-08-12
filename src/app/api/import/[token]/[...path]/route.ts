import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; path?: string[] }> }
) {
  const { token } = await params;

  const league = await prisma.league.findUnique({
    where: { exportToken: token },
    select: { name: true, status: true, isFree: true, slug: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  return NextResponse.json({
    league: league.name,
    slug: league.slug,
    status: league.status,
    ready: league.status === "ACTIVE" || league.isFree,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; path?: string[] }> }
) {
  const { token, path } = await params;
  const pathStr = path ? path.join("/") : "no-path";

  console.log("=== IMPORT HIT ===");
  console.log("Path:", pathStr);
  console.log("Method:", req.method);
  console.log("Content-Type:", req.headers.get("content-type"));
  console.log("Content-Length header:", req.headers.get("content-length"));

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
    });

    if (!league) {
      console.log("League not found");
      return NextResponse.json({ error: "Invalid export token" }, { status: 404 });
    }

    console.log("League found:", league.slug);

    // Try multiple ways to read the body
    let rawText = "";
    try {
      rawText = await req.text();
      console.log("Method text() length:", rawText.length);
    } catch (e: any) {
      console.log("text() failed:", e.message);
    }

    if (!rawText) {
      try {
        const buffer = await req.arrayBuffer();
        rawText = new TextDecoder().decode(buffer);
        console.log("Method arrayBuffer length:", rawText.length);
      } catch (e: any) {
        console.log("arrayBuffer failed:", e.message);
      }
    }

    console.log("Final body length:", rawText.length);
    console.log("Preview:", rawText.slice(0, 200));

    return new NextResponse(
      JSON.stringify({
        success: true,
        bodyLength: rawText.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}