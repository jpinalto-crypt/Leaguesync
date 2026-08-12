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
        orderBy: [{ overall: "desc" }],
        take: 8,
      },
      owner: { select: { name: true } },
      _count: {
        select: {
          players: true,
          games: true,
          weeklyExports: true,
          members: true,
        },
      },
    },
  });

  if (!league) notFound();

  const isOwner = session?.user?.id === league.ownerId;
  const isActive = league.status === "ACTIVE" || league.isFree;
  const exportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/import/${league.exportToken}`;
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${league.inviteCode || league.slug}`;

  // Check if current user is already a member
  let membership = null;
  if (session?.user?.id) {
    membership = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: session.user.id,
        },
      },
      include: { team: true },
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            <span className="text-emerald-400">Madden</span> League HQ
          </Link>
          <div className="flex items-center gap-5 text-sm">
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin" className="text-amber-400 hover:text-amber-300 transition">
                Admin
              </Link>
            )}
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition">
              Dashboard
            </Link>
            {session && (
              <a href="/api/auth/signout" className="text-zinc-500 hover:text-red-400 transition">
                Sign Out
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* League Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{league.name}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              }`}
            >
              {league.isFree ? "FREE" : league.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-zinc-400 text-sm">
            {league._count.players.toLocaleString()} players · {league.teams.length} teams ·{" "}
            {league._count.members} members · {league._count.weeklyExports} exports
          </p>
          {membership?.team && (
            <p className="text-emerald-400 text-sm mt-2">
              Your team: <span className="font-medium">{membership.team.name}</span>
            </p>
          )}
        </div>

        {/* Export URL Card (owner only when active) */}
        {isActive && isOwner && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-emerald-300 mb-1">Export URL</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Paste this into the Madden Companion App to sync your league.
            </p>
            <code className="block bg-zinc-950/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm break-all text-emerald-300/90 select-all font-mono">
              {exportUrl}
            </code>
          </div>
        )}

        {/* Invite Members (owner only) */}
        {isOwner && isActive && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold mb-1">Invite Members</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Share this link so others can sign in with Discord, join the league, and claim a team.
            </p>
            <code className="block bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm break-all text-sky-300 select-all font-mono">
              {inviteUrl}
            </code>
          </div>
        )}

        {/* Activate (owner, not active) */}
        {!isActive && isOwner && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-amber-300 mb-2">Activate League — $10</h2>
            <p className="text-zinc-400 text-sm mb-4">
              One-time payment to unlock the export URL and full features.
            </p>
            <ActivateButton leagueId={league.id} />
          </div>
        )}

        {/* Claim Team (member who hasn't claimed yet) */}
        {membership && !membership.teamId && isActive && (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-sky-300 mb-2">Claim Your Team</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Connect your Discord account to the team you control in this league.
            </p>
            <Link
              href={`/leagues/${slug}/claim`}
              className="inline-block bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Choose Team →
            </Link>
          </div>
        )}

        {/* Quick Links */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href={`/leagues/${slug}/players`}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm transition"
          >
            All Players →
          </Link>
          <Link
            href={`/leagues/${slug}/schedule`}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm transition"
          >
            Schedule →
          </Link>
        </div>

        {/* Standings */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Standings</h2>
            <span className="text-sm text-zinc-500">{league.teams.length} teams</span>
          </div>

          {league.teams.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
              No teams imported yet
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="px-5 py-3.5 font-medium">Team</th>
                    <th className="px-5 py-3.5 font-medium">Record</th>
                    <th className="px-5 py-3.5 font-medium">OVR</th>
                    <th className="px-5 py-3.5 font-medium hidden sm:table-cell">Division</th>
                    <th className="px-5 py-3.5 font-medium hidden md:table-cell">Conference</th>
                  </tr>
                </thead>
                <tbody>
                  {league.teams.map((team) => (
                    <tr
                      key={team.id}
                      className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/leagues/${slug}/teams/${team.id}`}
                          className="font-medium hover:text-emerald-400 transition"
                        >
                          {team.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        {formatRecord(team.recordWins, team.recordLosses, team.recordTies)}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">{team.overall ?? "—"}</td>
                      <td className="px-5 py-3.5 text-zinc-400 hidden sm:table-cell">
                        {team.division || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 hidden md:table-cell">
                        {team.conference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Top Players Preview */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Top Players</h2>
            <Link
              href={`/leagues/${slug}/players`}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition"
            >
              View all →
            </Link>
          </div>

          {league.players.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
              No players imported yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {league.players.map((player) => (
                <Link
                  key={player.id}
                  href={`/leagues/${slug}/players/${player.id}`}
                  className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {player.position}
                    </span>
                    <span className="text-2xl font-bold text-emerald-400 group-hover:scale-105 transition">
                      {player.overall ?? "—"}
                    </span>
                  </div>
                  <div className="font-medium group-hover:text-emerald-300 transition">
                    {player.firstName} {player.lastName}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Age {player.age ?? "—"} · SPD {player.speed ?? "—"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}