import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ActivateButton } from "@/components/ActivateButton";
import { formatRecord } from "@/lib/utils";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      teams: {
        orderBy: [{ recordWins: "desc" }, { name: "asc" }],
      },
      players: {
        orderBy: [{ overall: "desc" }, { lastName: "asc" }],
        take: 100, // show top 100 for now
      },
      owner: { select: { name: true } },
      _count: {
        select: {
          players: true,
          games: true,
          weeklyExports: true,
        },
      },
    },
  });

  if (!league) notFound();

  const isOwner = session?.user?.id === league.ownerId;
  const isActive = league.status === "ACTIVE" || league.isFree;
  const exportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/import/${league.exportToken}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
  <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
    <Link href="/dashboard" className="font-bold text-xl tracking-tight">
      <span className="text-emerald-400">Madden</span> League HQ
    </Link>
    <div className="flex items-center gap-4 text-sm">
      {session?.user?.role === "ADMIN" && (
        <Link href="/admin" className="text-amber-400 hover:text-amber-300">
          Admin
        </Link>
      )}
      <Link href="/dashboard" className="text-zinc-400 hover:text-white">
        Dashboard
      </Link>
      {session && (
        <a
          href="/api/auth/signout"
          className="text-zinc-400 hover:text-red-400 transition"
        >
          Sign Out
        </a>
      )}
    </div>
  </div>
</header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {league.isFree ? "FREE" : league.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-zinc-400">
            {league._count.players} players · {league.teams.length} teams ·{" "}
            {league._count.weeklyExports} exports received
          </p>
        </div>

        {/* Export URL */}
        {isActive && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8">
            <h2 className="font-semibold text-lg text-emerald-300 mb-2">
              Export URL
            </h2>
            <code className="block bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-sm break-all text-emerald-300 select-all">
              {exportUrl}
            </code>
          </div>
        )}

        {/* Teams */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">
            Teams & Standings ({league.teams.length})
          </h2>

          {league.teams.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
              No teams yet. Export standings from the Companion App.
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Record</th>
                    <th className="px-4 py-3">OVR</th>
                    <th className="px-4 py-3">Division</th>
                    <th className="px-4 py-3">Conference</th>
                  </tr>
                </thead>
                <tbody>
                  {league.teams.map((team) => (
                    <tr key={team.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium">
  <Link href={`/leagues/${slug}/teams/${team.id}`} className="hover:text-emerald-400">
    {team.name}
  </Link>
</td>
                      <td className="px-4 py-3">{team.overall ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{team.division || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{team.conference || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Players */}
<section>
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold">
      Players (showing top 100 of {league._count.players})
    </h2>
    <Link
      href={`/leagues/${slug}/players`}
      className="text-sm text-emerald-400 hover:text-emerald-300"
    >
      View all players →
    </Link>
  </div>

          {league.players.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
              No players yet. Export rosters from the Companion App.
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
                  {league.players.map((player) => (
                    <tr key={player.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
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
                      <td className="px-4 py-3 text-zinc-400">{player.development ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}