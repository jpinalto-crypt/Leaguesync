import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateLeagueForm } from "@/components/CreateLeagueForm";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { teams: true, players: true, games: true } },
    },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">
            <span className="text-emerald-400">Madden</span> League HQ
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">{session.user.name}</span>
            {session.user.role === "ADMIN" && (
              <Link href="/admin" className="text-amber-400 hover:text-amber-300">
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold">Your Leagues</h1>
            <p className="text-zinc-400 mt-1">
              Create a new league or manage existing ones.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {leagues.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center text-zinc-400">
                No leagues yet. Create your first one →
              </div>
            ) : (
              leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.slug}`}
                  className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-6 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{league.name}</h2>
                      <p className="text-sm text-zinc-400 mt-1">
                        {league.season || "2026"} · {league._count.teams} teams ·{" "}
                        {league._count.players} players · {league._count.games} games
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        league.status === "ACTIVE" || league.isFree
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {league.isFree ? "FREE" : league.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div>
            <CreateLeagueForm />
          </div>
        </div>
      </main>
    </div>
  );
}
