const BASE = "https://discord.com/api/v10";

function headers() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN não está definido no .env");
  }

  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function request(path) {
  const response = await fetch(`${BASE}${path}`, { headers: headers() });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord API ${response.status}: ${body || response.statusText}`);
  }

  return response.json();
}

export function fetchRecentChannelMessages(channelId, limit = 100) {
  return request(`/channels/${channelId}/messages?limit=${Math.min(Math.max(limit, 1), 100)}`);
}

export async function fetchGuildMembers(guildId) {
  const members = [];
  let after = "0";

  while (true) {
    const page = await request(`/guilds/${guildId}/members?limit=1000&after=${after}`);
    members.push(...page);

    if (page.length < 1000) break;

    after = page[page.length - 1]?.user?.id;
    if (!after) break;
  }

  return members;
}
