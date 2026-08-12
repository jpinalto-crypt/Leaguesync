import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; pos?: string }>;
}) {
  const { slug } = await params;
  const { q, pos } = await searchParams;

  const league = await prisma.league.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!league) notFound();

  const where: any = {
    leagueId: league.id,
  };

  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ];
  }

  if (pos) {
    where.position = pos;
  }

  const players = await prisma.player.findMany({
    where,
    orderBy: [{ overall: "desc" }, { lastName: "asc" }],
    take: 300,
  });

  const total = await prisma.player.count({
    where: { leagueId: league.id },
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/leagues/${slug}`} className="font-bold text-xl tracking-tight">
            <span className="text-emerald-400">←</span> {league.name}
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Players</h1>
            <p className="text-zinc-400 mt-1">
              Showing {players.length} of {total} players
            </p>
          </div>

          <form className="flex flex-wrap gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Search name..."
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 w-48"
            />
            <select
              name="pos"
              defaultValue={pos || ""}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Positions</option>
              <option value="QB">QB</option>
              <option value="HB">HB</option>
              <option value="FB">FB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="LT">LT</option>
              <option value="LG">LG</option>
              <option value="C">C</option>
              <option value="RG">RG</option>
              <option value="RT">RT</option>
              <option value="LEDGE">LEDGE</option>
              <option value="REDGE">REDGE</option>
              <option value="DT">DT</option>
              <option value="SAM">SAM</option>
              <option value="MIKE">MIKE</option>
              <option value="WILL">WILL</option>
              <option value="CB">CB</option>
              <option value="FS">FS</option>
              <option value="SS">SS</option>
              <option value="K">K</option>
              <option value="P">P</option>
            </select>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Search
            </button>
          </form>
        </div>

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
                <th className="px-4 py-3">ACC</th>
                <th className="px-4 py-3">AWR</th>
                <th className="px-4 py-3">Dev</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
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
                  <td className="px-4 py-3 text-zinc-400">{player.acceleration ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{player.awareness ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{player.development ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}