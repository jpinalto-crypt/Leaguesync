import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ClaimTeamButton } from "@/components/ClaimTeamButton";

export default async function ClaimTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/leagues/${slug}/claim`);
  }

  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      teams: { orderBy: { name: "asc" } },
      members: {
        where: { teamId: { not: null } },
        select: { teamId: true, user: { select: { name: true } } },
      },
    },
  });

  if (!league) notFound();

  const membership = await prisma.leagueMember.findUnique({
    where: {
      leagueId_userId: {
        leagueId: league.id,
        userId: session.user.id,
      },
    },
  });

  // Must be a member first
  if (!membership) {
    redirect(`/join/${league.inviteCode || league.slug}`);
  }

  // Already claimed
  if (membership.teamId) {
    redirect(`/leagues/${slug}/teams/${membership.teamId}`);
  }

  // Teams that are already taken
  const takenTeamIds = new Set(
    league.members.map((m) => m.teamId).filter(Boolean) as string[]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/leagues/${slug}`} className="font-semibold">
            <span className="text-emerald-400">←</span> {league.name}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Claim Your Team</h1>
        <p className="text-zinc-400 mb-8">
          Select the team you control in this league. This links your Discord account to that team.
        </p>

        <div className="space-y-2">
          {league.teams.map((team) => {
            const isTaken = takenTeamIds.has(team.id);
            const takenBy = league.members.find((m) => m.teamId === team.id)?.user
              ?.name;

            return (
              <div
                key={team.id}
                className={`flex items-center justify-between bg-zinc-900 border rounded-xl px-5 py-4 ${
                  isTaken ? "border-zinc-800 opacity-60" : "border-zinc-700"
                }`}
              >
                <div>
                  <div className="font-medium">{team.name}</div>
                  <div className="text-xs text-zinc-500">
                    {team.recordWins}-{team.recordLosses}
                    {team.recordTies ? `-${team.recordTies}` : ""}
                    {team.division ? ` · ${team.division}` : ""}
                    {isTaken && takenBy ? ` · Claimed by ${takenBy}` : ""}
                  </div>
                </div>

                {isTaken ? (
                  <span className="text-xs text-zinc-500">Taken</span>
                ) : (
                  <ClaimTeamButton leagueId={league.id} teamId={team.id} slug={slug} />
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}