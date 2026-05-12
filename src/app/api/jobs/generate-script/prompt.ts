export function buildScriptPrompt(
  name: string,
  language: string,
  origin: string | null,
  achievement: string | null
): string {
  const lang = language === "hi" ? "Hindi" : "English (with Indian expressions)";

  return `
You are writing a YouTube script for a faceless Indian success story channel.

Subject: ${name}
Origin: ${origin ?? "India"}
Achievement: ${achievement ?? "built a legendary business empire"}
Language: ${lang}
Target duration: 6-7 minutes (approximately 60 scenes, 6 seconds each)

Return ONLY a JSON object matching this exact schema — no markdown, no prose:

{
  "title": "YouTube video title (max 80 chars)",
  "hook": "First 15 seconds hook narration — must be dramatic and emotional",
  "scenes": [
    {
      "id": 1,
      "narration": "6-8 second narration text for this scene",
      "imagePrompt": "Subject-specific visual prompt (do NOT include style prefix)",
      "duration": 6
    }
    // ... approximately 60 scenes total
  ],
  "cta": "30-second call to action narration at the end"
}

Rules:
- Start with an emotional hook about a single defining moment
- Arc: humble origins → turning point → struggle → breakthrough → legacy
- Each imagePrompt must be specific (real places, objects, emotions)
- Never use the word "video" in narration
- Duration per scene: 5–8 seconds
- Total scenes: 58–62
`.trim();
}
