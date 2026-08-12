import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  console.log("=== EXPORT HIT ===");
  console.log("Token from query:", token);

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
    });

    if (!league) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    console.log("League found:", league.slug);

    const rawText = await req.text();
    console.log("Body length:", rawText.length);
    console.log("Preview:", rawText.slice(0, 300));

    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      body = {};
    }

    console.log("Body keys:", Object.keys(body));

    // TODO: parse roster/standings later once body is working

    return NextResponse.json({ success: true, bodyLength: rawText.length });
  } catch (err: any) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  return NextResponse.json({ message: "Export endpoint alive", token });
}