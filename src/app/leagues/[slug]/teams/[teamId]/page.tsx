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
      teamId: team.id,
    },
    orderBy: [{ overall: "desc" }, { lastName: "asc" }],
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
        {/* Team Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8">
          <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
          <p className="text-zinc-400">
            Record:{" "}
            <span className="text-white font-medium">
              {formatRecord(team.recordWins, team.recordLosses, team.recordTies)}
            </span>
            {" · "}
            OVR: <span className="text-emerald-400 font-medium">{team.overall ?? "—"}</span>
            {team.division && (
              <>
                {" · "}
                {team.division} {team.conference}
              </>
            )}
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            {players.length} players on roster
          </p>
        </div>

        {/* Roster */}
        <h2 className="text-xl font-semibold mb-4">Roster</h2>

        {players.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
            No players linked to this team yet.
            <br />
            <span className="text-sm">
              Re-export rosters from the Companion App after the latest update.
            </span>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Pos</th>
                  <th className="px-4 py-3">OVR</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">SPD</th>
                  <th className="px-4 py-3">STR</th>
                  <th className="px-4 py-3">AGI</th>
                  <th className="px-4 py-3">Dev</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/leagues/${slug}/players/${player.id}`}
                        className="hover:text-emerald-400"
                      >
                        {player.firstName} {player.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{player.position}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {player.overall ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{player.age ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{player.speed ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{player.strength ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{player.agility ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {player.development ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}