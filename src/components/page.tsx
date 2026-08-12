import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { JoinLeagueButton } from "@/components/JoinLeagueButton";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  const league = await prisma.league.findFirst({
    where: {
      OR: [{ inviteCode: code }, { slug: code }],
    },
    include: {
      teams: { orderBy: { name: "asc" } },
      _count: { select: { members: true } },
    },
  });

  if (!league) notFound();

  // Already a member?
  let existingMember = null;
  if (session?.user?.id) {
    existingMember = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: session.user.id,
        },
      },
    });
  }

  if (existingMember) {
    redirect(`/leagues/${league.slug}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold">
            <span className="text-emerald-400">Madden</span> League HQ
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-emerald-400 mb-2">You're invited to join</p>
          <h1 className="text-3xl font-bold mb-2">{league.name}</h1>
          <p className="text-zinc-400 text-sm mb-8">
            {league._count.members} members · {league.teams.length} teams
          </p>

          {!session ? (
            <div>
              <p className="text-zinc-400 text-sm mb-6">
                Sign in with Discord to join this league and claim your team.
              </p>
              <a
                href={`/api/auth/signin/discord?callbackUrl=/join/${code}`}
                className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl transition"
              >
                Sign in with Discord
              </a>
            </div>
          ) : (
            <JoinLeagueButton leagueId={league.id} inviteCode={code} />
          )}
        </div>
      </main>
    </div>
  );
}