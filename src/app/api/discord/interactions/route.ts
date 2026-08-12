import { NextRequest, NextResponse } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) {
    return new NextResponse("Bad request signature", { status: 401 });
  }

  const isValid = await verifyKey(body, signature, timestamp, publicKey);
  if (!isValid) {
    return new NextResponse("Invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Discord ping
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data.name;
    const options = interaction.data.options || [];

    // /standings
    if (commandName === "standings") {
      const leagueSlug = options.find((o: any) => o.name === "league")?.value;

      if (!leagueSlug) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Please provide a league slug. Example: `/standings league:tyest-league`" },
        });
      }

      const league = await prisma.league.findUnique({
        where: { slug: leagueSlug },
        include: {
          teams: {
            orderBy: [{ recordWins: "desc" }],
            take: 16,
          },
        },
      });

      if (!league) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `League \`${leagueSlug}\` not found.` },
        });
      }

      const lines = league.teams.map(
        (t, i) =>
          `**${i + 1}.** ${t.name} — ${t.recordWins}-${t.recordLosses}${
            t.recordTies ? `-${t.recordTies}` : ""
          } (OVR ${t.overall ?? "—"})`
      );

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: `${league.name} Standings`,
              description: lines.join("\n") || "No teams yet.",
              color: 0x10b981,
            },
          ],
        },
      });
    }

    // /player
    if (commandName === "player") {
      const name = options.find((o: any) => o.name === "name")?.value;
      const leagueSlug = options.find((o: any) => o.name === "league")?.value;

      if (!name || !leagueSlug) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Usage: `/player name:Mahomes league:tyest-league`" },
        });
      }

      const league = await prisma.league.findUnique({
        where: { slug: leagueSlug },
      });

      if (!league) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "League not found." },
        });
      }

      const player = await prisma.player.findFirst({
        where: {
          leagueId: league.id,
          OR: [
            { lastName: { contains: name, mode: "insensitive" } },
            { firstName: { contains: name, mode: "insensitive" } },
          ],
        },
        orderBy: { overall: "desc" },
      });

      if (!player) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `No player found matching "${name}".` },
        });
      }

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: `${player.firstName} ${player.lastName}`,
              description: `**${player.position}** · OVR **${player.overall ?? "—"}**`,
              color: 0x10b981,
              fields: [
                { name: "Age", value: String(player.age ?? "—"), inline: true },
                { name: "Speed", value: String(player.speed ?? "—"), inline: true },
                { name: "Strength", value: String(player.strength ?? "—"), inline: true },
                { name: "Agility", value: String(player.agility ?? "—"), inline: true },
                { name: "Acceleration", value: String(player.acceleration ?? "—"), inline: true },
                { name: "Awareness", value: String(player.awareness ?? "—"), inline: true },
              ],
            },
          ],
        },
      });
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Unknown command." },
    });
  }

  return NextResponse.json({ error: "Unknown interaction" }, { status: 400 });
}