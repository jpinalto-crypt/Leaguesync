import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathArray = path || [];

  console.log("=== IMPORT HIT ===");
  console.log("Full path:", pathArray.join("/"));

  // First segment is the token
  const token = pathArray[0];
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  console.log("Token:", token);

  try {
    const league = await prisma.league.findUnique({
      where: { exportToken: token },
    });

    if (!league) {
      console.log("League not found");
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    console.log("League found:", league.slug);

    const rawText = await req.text();
    console.log("Body length:", rawText.length);
    console.log("Preview:", rawText.slice(0, 300));

    return NextResponse.json({
      success: true,
      bodyLength: rawText.length,
    });
  } catch (err: any) {
    console.error("Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return NextResponse.json({
    message: "Import catch-all alive",
    path: path?.join("/") || "none",
  });
}