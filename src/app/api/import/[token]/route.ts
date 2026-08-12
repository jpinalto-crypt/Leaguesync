import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
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
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
    });

    if (!league) {
      return NextResponse.json({ error: "Invalid export token" }, { status: 404 });
    }

    if (league.status !== "ACTIVE" && !league.isFree) {
      return NextResponse.json(
        { error: "League is not active" },
        { status: 402 }
      );
    }

    // Read the body safely
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // Some exports might send empty or different content types
      body = {};
    }

    console.log("Received export for league:", league.slug);
    console.log("Body keys:", body ? Object.keys(body) : "no body");

    // For now just accept everything and return success
    // (we can parse teams/players later once the connection works)

    await prisma.weeklyExport.create({
      data: {
        leagueId: league.id,
        week: body?.weekIndex ?? body?.week ?? 0,
        type: "UNKNOWN",
        rawData: JSON.stringify(body).slice(0, 100000),
      },
    }).catch(() => {});

    // Return a simple success response that the Companion App likes
    return new NextResponse("OK", { status: 200 });
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Import failed", detail: err.message },
      { status: 500 }
    );
  }
}

// Handle preflight / OPTIONS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}