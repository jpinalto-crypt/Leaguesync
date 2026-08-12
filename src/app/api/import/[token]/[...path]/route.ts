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

    const rawText = await req.text();
    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      body = {};
    }

    const pathStr = path ? path.join("/") : "";
    console.log("Export received:", league.slug, pathStr);
    console.log("Body keys:", Object.keys(body));

    // ========== ROSTERS ==========
    if (body.rosterInfoList && Array.isArray(body.rosterInfoList)) {
      console.log("Parsing roster with", body.rosterInfoList.length, "players");

      let successCount = 0;
      let errorCount = 0;

      for (const p of body.rosterInfoList) {
        try {
          const firstName = p.firstName || "Unknown";
          const lastName = p.lastName || "Player";
          const position = p.position || "UNK";

          await prisma.player.create({
            data: {
              leagueId: league.id,
              firstName,
              lastName,
              position,
              jerseyNumber: p.jerseyNum ?? null,
              overall: p.playerBestOvr ?? p.overallRating ?? p.ovr ?? null,
              age: p.age ?? null,
              speed: p.speedRating ?? null,
              strength: p.strengthRating ?? null,
              agility: p.agilityRating ?? null,
              acceleration: p.accelRating ?? null,
              awareness: p.awareRating ?? null,
              development: p.devTrait != null ? String(p.devTrait) : null,
            },
          });
          successCount++;
        } catch (err: any) {
          errorCount++;
          console.error("Failed to create player:", err.message);
        }
      }

      console.log(`Roster import done. Success: ${successCount}, Errors: ${errorCount}`);
    }

    // ========== STANDINGS ==========
    if (body.teamStandingInfoList && Array.isArray(body.teamStandingInfoList)) {
      console.log("Parsing standings with", body.teamStandingInfoList.length, "teams");

      for (const s of body.teamStandingInfoList) {
        try {
          const teamName =
            s.teamName || s.displayName || s.teamDisplayName || String(s.teamId) || "Unknown Team";

          const existing = league.teams.find(
            (t) => t.name === teamName || t.abbreviation === String(s.teamId)
          );

          if (existing) {
            await prisma.team.update({
              where: { id: existing.id },
              data: {
                recordWins: s.totalWins ?? s.wins ?? existing.recordWins,
                recordLosses: s.totalLosses ?? s.losses ?? existing.recordLosses,
                recordTies: s.totalTies ?? s.ties ?? existing.recordTies,
                overall: s.teamOvr ?? s.overall ?? existing.overall,
                division: s.divisionName || s.divName || existing.division,
                conference: s.conferenceName || existing.conference,
                capAvailable: s.capRoom ?? existing.capAvailable,
              },
            });
          } else {
            await prisma.team.create({
              data: {
                leagueId: league.id,
                name: teamName,
                abbreviation: String(s.teamId || s.teamAbbr || teamName.slice(0, 3)),
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
        } catch (err: any) {
          console.error("Failed to create/update team:", err.message);
        }
      }
    }

    // Store raw data
    await prisma.weeklyExport.create({
      data: {
        leagueId: league.id,
        week: body?.weekIndex ?? body?.week ?? 0,
        type: pathStr || "UNKNOWN",
        rawData: rawText.slice(0, 80000),
      },
    }).catch((err) => console.error("Failed to save raw export:", err.message));

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