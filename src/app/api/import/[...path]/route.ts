import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const token = path?.[0];

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

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
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathArray = path || [];
  const token = pathArray[0];
  const pathStr = pathArray.slice(1).join("/");

  console.log("=== IMPORT HIT ===");
  console.log("Token:", token);
  console.log("Path:", pathStr);

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
    });

    if (!league) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (league.status !== "ACTIVE" && !league.isFree) {
      return NextResponse.json({ error: "League not active" }, { status: 402 });
    }

    const rawText = await req.text();
    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      body = {};
    }

    console.log("Body keys:", Object.keys(body));

    // ========== ROSTERS ==========
    if (body.rosterInfoList && Array.isArray(body.rosterInfoList)) {
      console.log("Parsing", body.rosterInfoList.length, "players");
      console.log("Full pathArray:", pathArray);

      let teamIdFromPath: string | null = null;
      const teamIndex = pathArray.findIndex((p) => p === "team");
      if (teamIndex !== -1 && pathArray[teamIndex + 1]) {
        teamIdFromPath = String(pathArray[teamIndex + 1]);
      }

      console.log("Team ID from path:", teamIdFromPath);

      let matchedTeam = null;
      if (teamIdFromPath) {
        matchedTeam = await prisma.team.findFirst({
          where: {
            leagueId: league.id,
            abbreviation: teamIdFromPath,
          },
        });
      }

      console.log(
        "Matched team:",
        matchedTeam ? `${matchedTeam.name} (${matchedTeam.id})` : "NONE"
      );

      let success = 0;
      let updated = 0;
      let failed = 0;

      for (const p of body.rosterInfoList) {
        try {
          const firstName = p.firstName || "Unknown";
          const lastName = p.lastName || "Player";
          const position = p.position || "UNK";

          const existing = await prisma.player.findFirst({
            where: {
              leagueId: league.id,
              firstName,
              lastName,
            },
          });

          const playerData = {
            teamId: matchedTeam?.id || null,
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
            height: p.height
              ? `${Math.floor(p.height / 12)}'${p.height % 12}"`
              : null,
            weight: p.weight ?? null,
          };

          if (existing) {
            await prisma.player.update({
              where: { id: existing.id },
              data: playerData,
            });
            updated++;
          } else {
            await prisma.player.create({
              data: {
                leagueId: league.id,
                firstName,
                lastName,
                ...playerData,
              },
            });
            success++;
          }
        } catch (err: any) {
          failed++;
          if (failed <= 3) console.error("Player error:", err.message);
        }
      }

      console.log(
        `Roster done → Created: ${success}, Updated: ${updated}, Failed: ${failed}`
      );
    }

    // ========== STANDINGS ==========
    if (body.teamStandingInfoList && Array.isArray(body.teamStandingInfoList)) {
      console.log("Parsing standings...", body.teamStandingInfoList.length);

      for (const s of body.teamStandingInfoList) {
        try {
          const name =
            s.teamName || s.displayName || String(s.teamId) || "Unknown";

          const existing = await prisma.team.findFirst({
            where: { leagueId: league.id, name },
          });

          if (existing) {
            await prisma.team.update({
              where: { id: existing.id },
              data: {
                recordWins: s.totalWins ?? s.wins ?? existing.recordWins,
                recordLosses: s.totalLosses ?? s.losses ?? existing.recordLosses,
                recordTies: s.totalTies ?? s.ties ?? existing.recordTies,
                overall: s.teamOvr ?? existing.overall,
                division: s.divisionName || s.divName || existing.division,
                conference: s.conferenceName || existing.conference,
                capAvailable: s.capRoom ?? existing.capAvailable,
                abbreviation: String(s.teamId || existing.abbreviation),
              },
            });
          } else {
            await prisma.team.create({
              data: {
                leagueId: league.id,
                name,
                abbreviation: String(s.teamId || name.slice(0, 3)),
                recordWins: s.totalWins ?? s.wins ?? 0,
                recordLosses: s.totalLosses ?? s.losses ?? 0,
                recordTies: s.totalTies ?? s.ties ?? 0,
                overall: s.teamOvr ?? null,
                division: s.divisionName || s.divName || null,
                conference: s.conferenceName || null,
                capAvailable: s.capRoom ?? null,
                isCpu: true,
              },
            });
          }
        } catch (err: any) {
          // ignore
        }
      }
    }

    // ========== SCHEDULES ==========
    if (body.gameScheduleInfoList && Array.isArray(body.gameScheduleInfoList)) {
      console.log("Parsing schedules...", body.gameScheduleInfoList.length);

      for (const g of body.gameScheduleInfoList) {
        try {
          const week = g.weekIndex ?? g.week ?? 0;
          const homeName = g.homeTeamName || g.homeTeam || "Home";
          const awayName = g.awayTeamName || g.awayTeam || "Away";

          const homeTeam = await prisma.team.findFirst({
            where: { leagueId: league.id, name: homeName },
          });
          const awayTeam = await prisma.team.findFirst({
            where: { leagueId: league.id, name: awayName },
          });

          if (!homeTeam || !awayTeam) continue;

          const existing = await prisma.game.findFirst({
            where: {
              leagueId: league.id,
              week,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
            },
          });

          if (existing) {
            await prisma.game.update({
              where: { id: existing.id },
              data: {
                homeScore: g.homeScore ?? existing.homeScore,
                awayScore: g.awayScore ?? existing.awayScore,
                isComplete: g.status === "Complete" || g.isComplete || false,
              },
            });
          } else {
            await prisma.game.create({
              data: {
                leagueId: league.id,
                week,
                seasonType: g.seasonType || "Regular",
                homeTeamId: homeTeam.id,
                awayTeamId: awayTeam.id,
                homeScore: g.homeScore ?? null,
                awayScore: g.awayScore ?? null,
                isComplete: g.status === "Complete" || false,
              },
            });
          }
        } catch (err: any) {
          console.error("Schedule parse error:", err.message);
        }
      }
    }

    return NextResponse.json({ success: true });
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