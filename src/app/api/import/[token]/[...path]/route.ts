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

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
      include: { teams: true },
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
    console.log("Export received:", league.slug, pathStr);

    // ========== PARSE STANDINGS ==========
    if (body.teamStandingInfoList && Array.isArray(body.teamStandingInfoList)) {
      console.log("Parsing standings...", body.teamStandingInfoList.length, "teams");

      for (const s of body.teamStandingInfoList) {
        const teamName = s.teamName || s.displayName || s.teamDisplayName || "Unknown";

        let team = league.teams.find(
          (t: any) => t.name === teamName || t.abbreviation === s.teamId
        );

        if (team) {
          await prisma.team.update({
            where: { id: team.id },
            data: {
              recordWins: s.totalWins ?? s.wins ?? team.recordWins,
              recordLosses: s.totalLosses ?? s.losses ?? team.recordLosses,
              recordTies: s.totalTies ?? s.ties ?? team.recordTies,
              overall: s.teamOvr ?? s.overall ?? team.overall,
              division: s.divisionName || s.divName || team.division,
              conference: s.conferenceName || team.conference,
              capAvailable: s.capRoom ?? team.capAvailable,
            },
          });
        } else {
          await prisma.team.create({
            data: {
              leagueId: league.id,
              name: teamName,
              abbreviation: s.teamAbbr || s.teamId || teamName.slice(0, 3).toUpperCase(),
              recordWins: s.totalWins ?? s.wins ?? 0,
              recordLosses: s.totalLosses ?? s.losses ?? 0,
              recordTies: s.totalTies ?? s.ties ?? 0,
              overall: s.teamOvr ?? s.overall ?? null,
              division: s.divisionName || s.divName || null,
              conference: s.conferenceName || null,
              capAvailable: s.capRoom ?? null,
              isCpu: true,
            },
          });
        }
      }
    }

    // ========== PARSE ROSTERS (basic) ==========
    if (body.rosterInfoList && Array.isArray(body.rosterInfoList)) {
      console.log("Parsing rosters...", body.rosterInfoList.length, "players");

      for (const p of body.rosterInfoList) {
        const firstName = p.firstName || p.rosterFirstName || "Unknown";
        const lastName = p.lastName || p.rosterLastName || "Player";
        const position = p.position || p.rosterPosition || "UNK";

        await prisma.player.create({
          data: {
            leagueId: league.id,
            firstName,
            lastName,
            position,
            jerseyNumber: p.jerseyNum || p.rosterJerseyNumber || null,
            overall: p.playerBestOvr || p.overallRating || p.ovr || null,
            age: p.age || null,
            development: p.devTrait ? String(p.devTrait) : null,
          },
        }).catch(() => {});
      }
    }

    // Store raw data as backup
    await prisma.weeklyExport.create({
      data: {
        leagueId: league.id,
        week: body?.weekIndex ?? body?.week ?? 0,
        type: pathStr || "UNKNOWN",
        rawData: JSON.stringify(body).slice(0, 50000),
      },
    }).catch(() => {});

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed", detail: err.message }, { status: 500 });
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