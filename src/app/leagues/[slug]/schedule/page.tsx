import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const league = await prisma.league.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!league) notFound();

  const games = await prisma.game.findMany({
    where: { leagueId: league.id },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
    orderBy: [{ week: "asc" }, { createdAt: "asc" }],
  });

  // Group by week
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
          <Link href={`/leagues/${slug}`} className="font-semibold">
            <span className="text-emerald-400">←</span> {league.name}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Schedule</h1>
        <p className="text-zinc-400 text-sm mb-8">
          {games.length} games · Export schedules from the Companion App to populate this
        </p>

        {weeks.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
            No schedule data yet.
            <br />
            <span className="text-sm">
              When the Companion App sends schedule exports with a body, games will appear here.
            </span>
          </div>
        ) : (
          <div className="space-y-8">
            {weeks.map((week) => (
              <section key={week}>
                <h2 className="text-lg font-semibold mb-3 text-zinc-300">
                  Week {week}
                </h2>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  {byWeek[week].map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50 last:border-0"
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <Link
                          href={`/leagues/${slug}/teams/${game.awayTeam.id}`}
                          className="hover:text-emerald-400"
                        >
                          {game.awayTeam.name}
                        </Link>
                        <span className="text-zinc-500">@</span>
                        <Link
                          href={`/leagues/${slug}/teams/${game.homeTeam.id}`}
                          className="hover:text-emerald-400 font-medium"
                        >
                          {game.homeTeam.name}
                        </Link>
                      </div>
                      <div className="text-sm tabular-nums">
                        {game.isComplete ? (
                          <span>
                            {game.awayScore ?? 0} – {game.homeScore ?? 0}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Upcoming</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}