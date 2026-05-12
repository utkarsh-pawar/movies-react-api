import Groq from "groq-sdk";
import { buildScriptPrompt } from "./prompt";
import type { ScriptJson } from "@/types";

export async function generateScriptWithGroq(
  name: string,
  language: string,
  origin: string | null,
  achievement: string | null
): Promise<ScriptJson> {
  const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = buildScriptPrompt(name, language, origin, achievement);

  const completion = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [
      { role: "system", content: "You are a professional YouTube scriptwriter. Return only valid JSON, no markdown." },
      { role: "user",   content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 4096,
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as ScriptJson;
}
