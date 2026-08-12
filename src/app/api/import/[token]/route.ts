import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Madden Companion App export endpoint.
 * Users paste: https://yourdomain.com/api/import/{exportToken}
 * The Companion App POSTs JSON payloads for:
 *  - League Info
 *  - Rosters
 *  - Weekly Stats (per week)
 *
 * This is a simplified but functional parser. Real Madden export
 * payloads can vary by year — we make it resilient.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
      include: { teams: true },
    });

    if (!league) {
      return NextResponse.json({ error: "Invalid export token" }, { status: 404 });
    }

    if (league.status !== "ACTIVE" && !league.isFree) {
      return NextResponse.json(
        { error: "League is not active. Please complete payment first." },
        { status: 402 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Detect payload type (Madden Companion App sends different shapes)
    const payloadType = detectPayloadType(body);

    if (payloadType === "LEAGUE_INFO") {
      await handleLeagueInfo(league.id, body);
    } else if (payloadType === "ROSTERS") {
      await handleRosters(league.id, body);
    } else if (payloadType === "WEEKLY_STATS") {
      await handleWeeklyStats(league.id, body);
    } else {
      // Store raw for debugging if unknown
      console.log("Unknown payload type for league", league.slug, Object.keys(body));
    }

    // Record the export
    await prisma.weeklyExport.create({
      data: {
        leagueId: league.id,
        week: body.weekIndex ?? body.week ?? 0,
        type: payloadType,
        rawData: JSON.stringify(body).slice(0, 50000), // limit size
      },
    }).catch(() => {}); // ignore unique conflicts

    return NextResponse.json({ success: true, type: payloadType });
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: "Import failed", detail: err.message },
      { status: 500 }
    );
  }
}

function detectPayloadType(body: any): string {
  if (body.leagueInfo || body.leagueName || body.teams?.length && !body.players) {
    return "LEAGUE_INFO";
  }
  if (body.rosterInfoList || body.players || body.roster) {
    return "ROSTERS";
  }
  if (body.weekIndex !== undefined || body.gameScheduleInfoList || body.teamStandingInfoList) {
    return "WEEKLY_STATS";
  }
  // Fallback heuristics
  if (Array.isArray(body) && body[0]?.position) return "ROSTERS";
  return "UNKNOWN";
}

async function handleLeagueInfo(leagueId: string, body: any) {
  // Extract teams if present
  const teamsData = body.teamInfoList || body.teams || body.leagueInfo?.teams || [];

  for (const t of teamsData) {
    const name = t.displayName || t.teamName || t.name || "Unknown Team";
    const abbr = t.abbrName || t.abbreviation || t.teamId || name.slice(0, 3).toUpperCase();

    await prisma.team.upsert({
      where: {
        // We don't have a natural unique, so find first by name+league
        id: (await prisma.team.findFirst({
          where: { leagueId, name },
        }))?.id || "new-" + Math.random(),
      },
      create: {
        leagueId,
        name,
        abbreviation: abbr,
        city: t.cityName || t.city,
        division: t.divName || t.division,
        conference: t.conferenceName || t.conference,
        overall: t.ovrRating || t.overall,
        isCpu: t.userName === "CPU" || !t.userName,
        primaryColor: t.primaryColor,
        secondaryColor: t.secondaryColor,
      },
      update: {
        overall: t.ovrRating || t.overall,
        isCpu: t.userName === "CPU" || !t.userName,
      },
    }).catch(async () => {
      // Fallback create if upsert fails due to id
      await prisma.team.create({
        data: {
          leagueId,
          name,
          abbreviation: abbr,
          city: t.cityName || t.city,
          division: t.divName || t.division,
          conference: t.conferenceName || t.conference,
          overall: t.ovrRating || t.overall,
          isCpu: t.userName === "CPU" || !t.userName,
        },
      });
    });
  }
}

async function handleRosters(leagueId: string, body: any) {
  const players = body.rosterInfoList || body.players || body.roster || [];

  // Clear old players for simplicity on full roster export (or merge later)
  // For production you may want smarter merge by rosterId / first+last+pos

  for (const p of players) {
    const firstName = p.firstName || p.rosterFirstName || "Unknown";
    const lastName = p.lastName || p.rosterLastName || "Player";
    const position = p.position || p.rosterPosition || "UNK";
    const teamAbbr = p.teamId || p.teamAbbr || p.teamName;

    // Find matching team
    let teamId: string | null = null;
    if (teamAbbr) {
      const team = await prisma.team.findFirst({
        where: {
          leagueId,
          OR: [
            { abbreviation: String(teamAbbr) },
            { name: { contains: String(teamAbbr) } },
          ],
        },
      });
      teamId = team?.id ?? null;
    }

    await prisma.player.create({
      data: {
        leagueId,
        teamId,
        firstName,
        lastName,
        position,
        jerseyNumber: p.jerseyNum || p.rosterJerseyNumber,
        overall: p.playerBestOvr || p.overallRating || p.ovr,
        age: p.age,
        height: p.height ? `${Math.floor(p.height / 12)}'${p.height % 12}"` : null,
        weight: p.weight,
        speed: p.speedRating || p.speed,
        strength: p.strengthRating || p.strength,
        agility: p.agilityRating || p.agility,
        acceleration: p.accelRating || p.acceleration,
        awareness: p.awareRating || p.awareness,
        development: mapDevTrait(p.devTrait || p.developmentTrait),
        tradeValue: p.tradeValue || p.playerValue,
        contractYears: p.contractYearsLeft || p.yearsLeft,
        salary: p.capHit || p.salary,
        isOnTradeBlock: !!p.isOnTradeBlock,
        injuryStatus: p.injuryType || p.injuryStatus,
      },
    }).catch(() => {}); // skip duplicates for now
  }
}

async function handleWeeklyStats(leagueId: string, body: any) {
  const week = body.weekIndex ?? body.week ?? 0;
  const seasonType = body.seasonType || "Regular";

  // Update standings if present
  const standings = body.teamStandingInfoList || body.standings || [];
  for (const s of standings) {
    const teamName = s.teamName || s.displayName;
    if (!teamName) continue;

    await prisma.team.updateMany({
      where: { leagueId, name: teamName },
      data: {
        recordWins: s.totalWins ?? s.wins ?? 0,
        recordLosses: s.totalLosses ?? s.losses ?? 0,
        recordTies: s.totalTies ?? s.ties ?? 0,
        overall: s.teamOvr ?? undefined,
      },
    });
  }

  // Games / schedule
  const games = body.gameScheduleInfoList || body.games || body.schedule || [];
  for (const g of games) {
    const homeName = g.homeTeamName || g.homeTeam;
    const awayName = g.awayTeamName || g.awayTeam;
    if (!homeName || !awayName) continue;

    const home = await prisma.team.findFirst({ where: { leagueId, name: homeName } });
    const away = await prisma.team.findFirst({ where: { leagueId, name: awayName } });
    if (!home || !away) continue;

    // Avoid duplicates
    const existing = await prisma.game.findFirst({
      where: { leagueId, week, homeTeamId: home.id, awayTeamId: away.id },
    });

    if (existing) {
      await prisma.game.update({
        where: { id: existing.id },
        data: {
          homeScore: g.homeScore ?? g.homeTeamScore,
          awayScore: g.awayScore ?? g.awayTeamScore,
          isComplete: g.status === "Final" || g.isComplete || (g.homeScore != null),
        },
      });
    } else {
      await prisma.game.create({
        data: {
          leagueId,
          week,
          seasonType,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore: g.homeScore ?? g.homeTeamScore,
          awayScore: g.awayScore ?? g.awayTeamScore,
          isComplete: g.status === "Final" || (g.homeScore != null),
        },
      });
    }
  }

  // Update league current week
  await prisma.league.update({
    where: { id: leagueId },
    data: { currentWeek: week },
  });
}

function mapDevTrait(trait: any): string {
  if (!trait) return "Normal";
  const t = String(trait).toLowerCase();
  if (t.includes("xfactor") || t === "3") return "X-Factor";
  if (t.includes("superstar") || t === "2") return "Superstar";
  if (t.includes("star") || t === "1") return "Star";
  return "Normal";
}

// Optional GET so people can test the token exists
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
