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
      {/* Header */}
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
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* League Title */}
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
            Season {league.season || "2026"} · Owner: {league.owner.name || "Unknown"} ·{" "}
            {league._count.players} players · {league._count.weeklyExports} exports received
          </p>
        </div>

        {/* Activation / Export URL */}
        {!isActive && isOwner && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-8">
            <h2 className="font-semibold text-lg text-amber-300 mb-2">
              Activate this league — $10 one-time
            </h2>
            <p className="text-zinc-300 text-sm mb-4">
              Payment unlocks the import URL so you can export from the Madden Companion App.
            </p>
            <ActivateButton leagueId={league.id} />
          </div>
        )}

        {isActive && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8">
            <h2 className="font-semibold text-lg text-emerald-300 mb-2">
              Export URL (paste into Madden Companion App)
            </h2>
            <p className="text-zinc-400 text-sm mb-3">
              In the Companion App → Manage Franchise → Export → paste this URL.
              Export League Info first, then Rosters, then Weekly Stats / Standings.
            </p>
            <code className="block bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-sm break-all text-emerald-300 select-all">
              {exportUrl}
            </code>
          </div>
        )}

        {/* Teams / Standings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Teams & Standings</h2>
            <span className="text-sm text-zinc-500">{league.teams.length} teams</span>
          </div>

          {league.teams.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
              No teams imported yet.
              <br />
              <span className="text-sm">
                Export Standings / Weekly Stats from the Companion App to see teams here.
              </span>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    <th className="px-4 py-3 font-medium">Team</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                    <th className="px-4 py-3 font-medium">OVR</th>
                    <th className="px-4 py-3 font-medium">Division</th>
                    <th className="px-4 py-3 font-medium">Conference</th>
                    <th className="px-4 py-3 font-medium">Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {league.teams.map((team) => (
                    <tr
                      key={team.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3 font-medium">
                        {team.name}
                        {team.isCpu && (
                          <span className="ml-2 text-xs text-zinc-500">CPU</span>
                        )}
                      </