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

    // ========== /standings ==========
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

    // ========== /player ==========
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

    // ========== /team ==========
    if (commandName === "team") {
      const teamName = options.find((o: any) => o.name === "name")?.value;
      const leagueSlug = options.find((o: any) => o.name === "league")?.value;

      if (!teamName || !leagueSlug) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Usage: `/team name:Chiefs league:tyest-league`" },
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

      const team = await prisma.team.findFirst({
        where: {
          leagueId: league.id,
          name: { contains: teamName, mode: "insensitive" },
        },
      });

      if (!team) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `No team found matching "${teamName}".` },
        });
      }

      const topPlayers = await prisma.player.findMany({
        where: { leagueId: league.id },
        orderBy: { overall: "desc" },
        take: 5,
      });

      const playerLines = topPlayers.map(
        (p) => `• ${p.firstName} ${p.lastName} (${p.position}) — ${p.overall ?? "—"} OVR`
      );

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: team.name,
              description: `Record: **${team.recordWins}-${team.recordLosses}${
                team.recordTies ? `-${team.recordTies}` : ""
              }** · OVR **${team.overall ?? "—"}**\n${team.division || ""} ${team.conference || ""}`,
              color: 0x10b981,
              fields: [
                {
                  name: "Top Players (league)",
                  value: playerLines.join("\n") || "No players",
                },
              ],
            },
          ],
        },
      });
    }

    // ========== /top ==========
    if (commandName === "top") {
      const leagueSlug = options.find((o: any) => o.name === "league")?.value;
      const position = options.find((o: any) => o.name === "position")?.value;

      if (!leagueSlug) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Usage: `/top league:tyest-league position:WR`" },
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

      const where: any = { leagueId: league.id };
      if (position) where.position = position;

      const players = await prisma.player.findMany({
        where,
        orderBy: { overall: "desc" },
        take: 10,
      });

      const lines = players.map(
        (p, i) =>
          `**${i + 1}.** ${p.firstName} ${p.lastName} (${p.position}) — **${p.overall ?? "—"}** OVR`
      );

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: position
                ? `Top ${position}s — ${league.name}`
                : `Top Players — ${league.name}`,
              description: lines.join("\n") || "No players found.",
              color: 0x10b981,
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