import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string; playerId: string }>;
}) {
  const { slug, playerId } = await params;

  const league = await prisma.league.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!league) notFound();

  const player = await prisma.player.findFirst({
    where: {
      id: playerId,
      leagueId: league.id,
    },
  });

  if (!player) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/leagues/${slug}/players`} className="font-bold text-xl tracking-tight">
            <span className="text-emerald-400">←</span> Players
          </Link>
          <Link href={`/leagues/${slug}`} className="text-sm text-zinc-400 hover:text-white">
            {league.name}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Player Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-emerald-400 text-sm font-medium mb-1">{player.position}</p>
              <h1 className="text-4xl font-bold">
                {player.firstName} {player.lastName}
              </h1>
              <p className="text-zinc-400 mt-2">
                Age {player.age ?? "—"} · {player.height || "—"} · {player.weight ? `${player.weight} lbs` : "—"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-emerald-400">{player.overall ?? "—"}</div>
              <div className="text-sm text-zinc-500">Overall</div>
            </div>
          </div>
        </div>

        {/* Ratings Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Speed", value: player.speed },
            { label: "Acceleration", value: player.acceleration },
            { label: "Agility", value: player.agility },
            { label: "Strength", value: player.strength },
            { label: "Awareness", value: player.awareness },
            { label: "Development", value: player.development },
            { label: "Jersey", value: player.jerseyNumber },
            { label: "Trade Value", value: player.tradeValue },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-semibold">{stat.value ?? "—"}</div>
              <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Contract / Other</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Contract Years:</span>{" "}
              {player.contractYears ?? "—"}
            </div>
            <div>
              <span className="text-zinc-500">Salary / Cap Hit:</span>{" "}
              {player.salary ? `$${(player.salary / 1000000).toFixed(2)}M` : "—"}
            </div>
            <div>
              <span className="text-zinc-500">On Trade Block:</span>{" "}
              {player.isOnTradeBlock ? "Yes" : "No"}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}