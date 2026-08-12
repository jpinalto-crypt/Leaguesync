import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId, teamId } = await req.json();

  if (!leagueId || !teamId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Must be a member
  const membership = await prisma.leagueMember.findUnique({
    where: {
      leagueId_userId: {
        leagueId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this league" }, { status: 403 });
  }

  if (membership.teamId) {
    return NextResponse.json({ error: "You already claimed a team" }, { status: 400 });
  }

  // Team must exist in this league
  const team = await prisma.team.findFirst({
    where: { id: teamId, leagueId },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Team must not already be claimed
  const alreadyClaimed = await prisma.leagueMember.findFirst({
    where: { leagueId, teamId },
  });

  if (alreadyClaimed) {
    return NextResponse.json({ error: "Team already claimed" }, { status: 400 });
  }

  await prisma.leagueMember.update({
    where: { id: membership.id },
    data: { teamId },
  });

  return NextResponse.json({ success: true, teamId });
}