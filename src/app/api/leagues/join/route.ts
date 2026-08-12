import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId, inviteCode } = await req.json();

  const league = await prisma.league.findFirst({
    where: {
      id: leagueId,
      OR: [{ inviteCode }, { slug: inviteCode }],
    },
  });

  if (!league) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (league.status !== "ACTIVE" && !league.isFree) {
    return NextResponse.json({ error: "League is not active" }, { status: 400 });
  }

  // Already a member?
  const existing = await prisma.leagueMember.findUnique({
    where: {
      leagueId_userId: {
        leagueId: league.id,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ slug: league.slug, alreadyMember: true });
  }

  await prisma.leagueMember.create({
    data: {
      leagueId: league.id,
      userId: session.user.id,
      role: "MEMBER",
    },
  });

  return NextResponse.json({ slug: league.slug });
}