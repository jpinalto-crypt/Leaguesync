import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TeamSchedulePage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;

  const league = await prisma.league.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!league) notFound();

  const team = await prisma.team.findFirst({
    where: { id: teamId, leagueId: league.id },
  });

  if (!team) notFound();

  const games = await prisma.game.findMany({
    where: {
      leagueId: league.id,
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
    orderBy: [{ week: "asc" }, { createdAt: "asc" }],
  });

  const byWeek: Record<number, typeof games> = {};
  for (const g of games) {
    if (!byWeek[g.week]) byWeek[g.week] = [];
    byWeek[g.week].push(g);
  }

  const weeks = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href={`/leagues/${slug}/teams/${teamId}`}
            className="font-semibold"
          >
            <span className="text-emerald-400">←</span> {team.name}
          </Link>
          <Link
            href={`/leagues/${slug}/schedule`}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Full schedule
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">{team.name} Schedule</h1>
        <p className="text-zinc-400 text-sm mb-8">
          {games.length} games · {league.name}
        </p>

        {weeks.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
            No games found for this team yet.
          </div>
        ) : (
          <div className="space-y-8">
            {weeks.map((week) => (
              <section key={week}>
                <h2 className="text-lg font-semibold mb-3 text-zinc-300">
                  Week {week}
                </h2>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  {byWeek[week].map((game) => {
                    const isHome = game.homeTeamId === team.id;
                    const opponent = isHome ? game.awayTeam : game.homeTeam;
                    const teamScore = isHome ? game.homeScore : game.awayScore;
                    const oppScore = isHome ? game.awayScore : game.homeScore;
                    const result =
                      game.isComplete && teamScore != null && oppScore != null
                        ? teamScore > oppScore
                          ? "W"
                          : teamScore < oppScore
                          ? "L"
                          : "T"
                        : null;

                    return (
                      <div
                        key={game.id}
                        className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50 last:border-0"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-zinc-500 w-8">
                            {isHome ? "vs" : "@"}
                          </span>
                          <Link
                            href={`/leagues/${slug}/teams/${opponent.id}`}
                            className="hover:text-emerald-400 font-medium"
                          >
                            {opponent.name}
                          </Link>
                        </div>
                        <div className="text-sm tabular-nums flex items-center gap-3">
                          {game.isComplete ? (
                            <>
                              <span
                                className={
                                  result === "W"
                                    ? "text-emerald-400 font-semibold"
                                    : result === "L"
                                    ? "text-red-400 font-semibold"
                                    : "text-zinc-400"
                                }
                              >
                                {result}
                              </span>
                              <span>
                                {teamScore ?? 0} – {oppScore ?? 0}
                              </span>
                            </>
                          ) : (
                            <span className="text-zinc-500">Upcoming</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}