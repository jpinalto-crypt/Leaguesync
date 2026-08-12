import { NextRequest, NextResponse } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("=== Discord Interaction received ===");

  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  console.log("Has signature:", !!signature);
  console.log("Has timestamp:", !!timestamp);
  console.log("Body length:", body.length);
  console.log("Public key exists:", !!process.env.DISCORD_PUBLIC_KEY);
  console.log("Public key length:", process.env.DISCORD_PUBLIC_KEY?.length || 0);

  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey || !signature || !timestamp) {
    console.log("Missing required fields for verification");
    return new NextResponse("Bad request signature", { status: 401 });
  }

  let isValid = false;
  try {
    isValid = await verifyKey(body, signature, timestamp, publicKey);
    console.log("Signature valid:", isValid);
  } catch (err: any) {
    console.log("verifyKey error:", err.message);
  }

  if (!isValid) {
    return new NextResponse("Invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(body);
  console.log("Interaction type:", interaction.type);

  if (interaction.type === InteractionType.PING) {
    console.log("Responding with PONG");
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: "Command received (debug mode)" },
  });
}