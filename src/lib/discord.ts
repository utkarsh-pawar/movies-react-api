const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

type Level = "info" | "success" | "error";

const COLORS: Record<Level, number> = {
  info:    0x1e3a5f,   // deep blue
  success: 0x2ecc71,
  error:   0xe74c3c,
};

export async function notify(
  level: Level,
  title: string,
  description?: string
) {
  if (!WEBHOOK) return;

  try {
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description,
            color: COLORS[level],
            timestamp: new Date().toISOString(),
            footer: { text: "Indian Success Stories Bot" },
          },
        ],
      }),
    });
  } catch {
    // non-fatal — never let Discord failures crash the job
  }
}
