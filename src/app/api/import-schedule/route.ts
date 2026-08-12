import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId, data } = await req.json();

  if (!leagueId || !data) {
    return NextResponse.json({ error: "Missing leagueId or data" }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  // Only owner or admin
  if (league.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body = data;
  if (typeof data === "string") {
    try {
      body = JSON.parse(data);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const list = body.gameScheduleInfoList;
  if (!Array.isArray(list)) {
    return NextResponse.json(
      { error: "No gameScheduleInfoList found in JSON" },
      { status: 400 }
    );
  }

  const teams = await prisma.team.findMany({
    where: { leagueId: league.id },
  });

  const teamByAppId = new Map(
    teams.map((t) => [String(t.abbreviation), t])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const g of list) {
    try {
      const week = g.weekIndex ?? g.week ?? 0;
      const homeTeam = teamByAppId.get(String(g.homeTeamId ?? ""));
      const awayTeam = teamByAppId.get(String(g.awayTeamId ?? ""));

      if (!homeTeam || !awayTeam) {
        skipped++;
        continue;
      }

      const isComplete =
        g.status === 3 || g.status === "Complete" || g.isComplete === true;

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
            isComplete,
          },
        });
        updated++;
      } else {
        await prisma.game.create({
          data: {
            leagueId: league.id,
            week,
            seasonType: g.stageIndex === 0 ? "Preseason" : "Regular",
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore: g.homeScore ?? null,
            awayScore: g.awayScore ?? null,
            isComplete,
          },
        });
        created++;
      }
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ created, updated, skipped, total: list.length });
}