import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  console.log("Token:", token);
  console.log("Path:", pathStr);

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
    });

    if (!league) {
      console.log("League not found for token");
      return NextResponse.json({ error: "Invalid export token" }, { status: 404 });
    }

    console.log("League found:", league.slug);

    // Read raw body
    const rawText = await req.text();
    console.log("Raw body length:", rawText.length);
    console.log("Raw body preview:", rawText.slice(0, 300));

    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
      console.log("Parsed body keys:", Object.keys(body));
    } catch (e: any) {
      console.log("JSON parse failed:", e.message);
      body = {};
    }

    // Check for roster
    if (body.rosterInfoList) {
      console.log("FOUND rosterInfoList with", body.rosterInfoList.length, "players");
    } else {
      console.log("NO rosterInfoList found in body");
    }

    // Check for standings
    if (body.teamStandingInfoList) {
      console.log("FOUND teamStandingInfoList with", body.teamStandingInfoList.length, "teams");
    } else {
      console.log("NO teamStandingInfoList found in body");
    }

    // For now just return success so the Companion App is happy
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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