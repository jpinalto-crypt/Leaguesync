import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminCreateLeagueForm } from "@/components/AdminCreateLeagueForm";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const leagues = await prisma.league.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { teams: true, players: true } },
    },
  });

  const totalPaid = await prisma.league.count({
    where: { status: "ACTIVE", isFree: false },
  });

  return (
    <div className="min-h-screen">
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
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-zinc-400 mb-8">
          Paid leagues: {totalPaid} · Total shown: {leagues.length}
        </p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-semibold mb-4">Recent Leagues</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Teams</th>
                  </tr>
                </thead>
                <tbody>
                  {leagues.map((l) => (
                    <tr key={l.id} className="border-b border-zinc-800/50">
                      <td className="px-4 py-3">
                        <Link href={`/leagues/${l.slug}`} className="hover:text-emerald-400">
                          {l.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{l.owner.name || l.owner.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            l.isFree
                              ? "bg-blue-500/15 text-blue-400"
                              : l.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {l.isFree ? "FREE" : l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{l._count.teams}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <AdminCreateLeagueForm />
          </div>
        </div>
      </main>
    </div>
  );
}
