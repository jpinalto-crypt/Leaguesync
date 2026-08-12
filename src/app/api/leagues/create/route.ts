import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, season } = body;

  if (!name || name.length < 3) {
    return NextResponse.json({ error: "League name must be at least 3 characters" }, { status: 400 });
  }

  let baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 1;
  while (await prisma.league.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${attempt++}`;
  }

  const league = await prisma.league.create({
    data: {
      name,
      slug,
      description: description || null,
      season: season || "2026",
      status: "PENDING_PAYMENT",
      isFree: false,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    league: {
      id: league.id,
      name: league.name,
      slug: league.slug,
      status: league.status,
    },
  });
}
