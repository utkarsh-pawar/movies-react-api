import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildScriptPrompt } from "./prompt";
import type { ScriptJson } from "@/types";

export async function generateScriptWithGemini(
  name: string,
  language: string,
  origin: string | null,
  achievement: string | null
): Promise<ScriptJson> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = buildScriptPrompt(name, language, origin, achievement);
  const result = await model.generateContent(prompt);
  const text   = result.response.text();

  // Strip markdown code fences if present
  const json = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(json) as ScriptJson;
}
