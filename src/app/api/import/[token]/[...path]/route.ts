import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
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

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
    });

    if (!league) {
      return NextResponse.json({ error: "Invalid export token" }, { status: 404 });
    }

    if (league.status !== "ACTIVE" && !league.isFree) {
      return NextResponse.json({ error: "League is not active" }, { status: 402 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const pathStr = path ? path.join("/") : "";
    console.log("Export received:", {
      league: league.slug,
      path: pathStr,
      keys: Object.keys(body),
    });

    // Store raw data for now
    await prisma.weeklyExport.create({
      data: {
        leagueId: league.id,
        week: body?.weekIndex ?? body?.week ?? 0,
        type: pathStr || "UNKNOWN",
        rawData: JSON.stringify(body).slice(0, 100000),
      },
    }).catch(() => {});

    // Return simple success that the Companion App expects
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