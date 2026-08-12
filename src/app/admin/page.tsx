import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminCreateLeagueForm } from "@/components/AdminCreateLeagueForm";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const leagues = await prisma.league.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { players: true, teams: true } },
    },
  });

  const users = await prisma.user.count();
  const activeLeagues = leagues.filter(
    (l) => l.status === "ACTIVE" || l.isFree
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-xl tracking-tight">
            <span className="text-emerald-400">Madden</span> League HQ
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-amber-400 font-medium">Admin</span>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white">
              Dashboard
            </Link>
            <a href="/api/auth/signout" className="text-zinc-500 hover:text-red-400">
              Sign Out
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-zinc-400 mb-10">
          Manage leagues and create free leagues for testing.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="text-2xl font-bold">{leagues.length}</div>
            <div className="text-sm text-zinc-500">Total Leagues</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="text-2xl font-bold text-emerald-400">{activeLeagues}</div>
            <div className="text-sm text-zinc-500">Active</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="text-2xl font-bold">{users}</div>
            <div className="text-sm text-zinc-500">Users</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="text-2xl font-bold">
              {leagues.reduce((sum, l) => sum + l._count.players, 0)}
            </div>
            <div className="text-sm text-zinc-500">Total Players</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Create Free League */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
              <h2 className="font-semibold text-lg mb-4">Create Free League</h2>
              <AdminCreateLeagueForm />
            </div>
          </div>

          {/* All Leagues */}
          <div className="lg:col-span-2">
            <h2 className="font-semibold text-lg mb-4">All Leagues</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    <th className="px-4 py-3">League</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Players</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {leagues.map((league) => (
                    <tr
                      key={league.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3 font-medium">{league.name}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {league.owner.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            league.status === "ACTIVE" || league.isFree
                              ? "bg-emerald-500/15 text-emerald-400"
                              : league.status === "DISABLED"
                              ? "bg-red-500/15 text-red-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {league.isFree ? "FREE" : league.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {league._count.players}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/leagues/${league.slug}`}
                          className="text-emerald-400 hover:text-emerald-300 text-xs"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}