/**
 * Generates a full video script (JSON) using Gemini or Groq.
 * Saves scenes to Supabase, then fires generate-images.
 * Must complete in <10 s — LLM calls are fast on flash models.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { markJobRunning, markJobDone, markJobFailed, createJob, updateStoryStatus } from "@/lib/jobs";
import { notify } from "@/lib/discord";
import { generateScriptWithGemini } from "./gemini";
import { generateScriptWithGroq } from "./groq";
import type { ScriptJson } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId, jobId } = await req.json();
  if (!storyId || !jobId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  await markJobRunning(jobId);

  try {
    const { data: story } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (!story) throw new Error("Story not found");

    const provider = process.env.SCRIPT_LLM_PROVIDER ?? "gemini";
    const script: ScriptJson =
      provider === "groq"
        ? await generateScriptWithGroq(story.name, story.language, story.origin, story.achievement)
        : await generateScriptWithGemini(story.name, story.language, story.origin, story.achievement);

    // Persist script JSON on the story
    await supabase.from("stories").update({ script_json: script }).eq("id", storyId);

    // Insert scene records
    const sceneRows = script.scenes.map((s) => ({
      story_id:     storyId,
      scene_order:  s.id,
      narration:    s.narration,
      image_prompt: s.imagePrompt,
      duration:     s.duration,
    }));
    const { error: sceneErr } = await supabase.from("scenes").insert(sceneRows);
    if (sceneErr) throw new Error(`Scene insert failed: ${sceneErr.message}`);

    await updateStoryStatus(storyId, "scripted");
    await markJobDone(jobId);

    // Chain: generate-images
    const nextJobId = await createJob("generate-images", storyId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    void fetch(`${appUrl}/api/jobs/generate-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ storyId, jobId: nextJobId }),
    });

    await notify("success", `Script done: ${story.name}`, `${script.scenes.length} scenes generated`);
    return NextResponse.json({ ok: true, scenes: script.scenes.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobFailed(jobId, msg);
    await updateStoryStatus(storyId, "failed");
    await notify("error", "generate-script failed", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
