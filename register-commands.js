const DISCORD_TOKEN = "MTUzNzE3MTQyODk3NjEwNzUyMA.GAMYom.Ai3SJruCpJn3UnT2mcIvCcqpbia-ZG0jSghafE";
const CLIENT_ID = "1537171428976107520";

const commands = [
  {
    name: "standings",
    description: "Show league standings",
    options: [
      {
        name: "league",
        description: "League slug (e.g. tyest-league)",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "player",
    description: "Look up a player",
    options: [
      {
        name: "name",
        description: "Player name",
        type: 3,
        required: true,
      },
      {
        name: "league",
        description: "League slug",
        type: 3,
        required: true,
      },
    ],
  },
];

async function main() {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    }
  );

  const data = await res.json();
  console.log(res.status, data);
}

main();