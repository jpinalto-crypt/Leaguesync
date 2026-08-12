import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, ownerEmail, season } = body;

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  let ownerId = session.user.id;

  // Optionally assign to another user by email
  if (ownerEmail) {
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (owner) ownerId = owner.id;
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
      status: "ACTIVE",
      isFree: true,
      ownerId,
      members: {
        create: {
          userId: ownerId,
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
      exportToken: league.exportToken,
      exportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/import/${league.exportToken}`,
    },
  });
}
