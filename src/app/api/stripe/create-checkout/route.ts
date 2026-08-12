import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-07-29.dahlia", // use latest stable when deploying
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId } = await req.json();
  if (!leagueId) {
    return NextResponse.json({ error: "leagueId required" }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  });

  if (!league || league.ownerId !== session.user.id) {
    return NextResponse.json({ error: "League not found or not owned by you" }, { status: 404 });
  }

  if (league.status === "ACTIVE" || league.isFree) {
    return NextResponse.json({ error: "League already active" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    // Dev fallback: auto-activate without real Stripe
    await prisma.league.update({
      where: { id: leagueId },
      data: { status: "ACTIVE", paidAt: new Date() },
    });
    return NextResponse.json({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/leagues/${league.slug}?activated=1`,
      demo: true,
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/leagues/${league.slug}?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=1`,
    metadata: {
      leagueId: league.id,
      userId: session.user.id,
    },
    customer_email: session.user.email || undefined,
  });

  // Store session id for later verification
  await prisma.league.update({
    where: { id: leagueId },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
