import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatRecord } from "@/lib/utils";

export default async function TeamPage({
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
    where: {
      id: teamId,
      leagueId: league.id,
    },
  });

  if (!team) notFound();

  const players = await prisma.player.findMany({
    where: {
      leagueId: league.id,
      // For now we don't have teamId linked perfectly, so we'll show all for this demo
      // Later we can improve the import to properly link players to teams
    },
    orderBy: [{ overall: "desc" }],
    take: 50,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/leagues/${slug}`} className="font-bold text-xl tracking-tight">
            <span className="text-emerald-400">←</span> {league.name}
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-zinc-400 mt-2">
            Record: {formatRecord(team.recordWins, team.recordLosses, team.recordTies)} · 
            OVR: {team.overall ?? "—"} · 
            {team.division || ""} {team.conference || ""}
          </p>
        </div>

        <h2 className="text-xl font-semibold mb-4">Roster (sample)</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Note: Player-to-team linking is not fully complete yet from the imports. Showing top players for now.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">OVR</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">SPD</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium">
                    {player.firstName} {player.lastName}
                  </td>
                  <td className="px-4 py-3">{player.position}</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">
                    {player.overall ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{player.age ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{player.speed ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}