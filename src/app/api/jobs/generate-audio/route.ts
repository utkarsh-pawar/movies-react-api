/**
 * Generates per-scene MP3 narration using Microsoft Edge TTS (free).
 * Uses the `edge-tts` CLI (installed as npm package `edge-tts`).
 * Processes scenes sequentially to avoid memory spikes on Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { supabase } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";
import { markJobRunning, markJobDone, markJobFailed, createJob, updateStoryStatus } from "@/lib/jobs";
import { notify } from "@/lib/discord";

export const runtime = "nodejs";
export const maxDuration = 10;

const execFileAsync = promisify(execFile);

const VOICE_MAP: Record<string, string> = {
  en: "en-IN-PrabhatNeural",
  hi: "hi-IN-MadhurNeural",
};

async function synthesize(text: string, voice: string): Promise<{ buffer: Buffer; duration: number }> {
  const tmpMp3  = path.join(tmpdir(), `tts-${Date.now()}.mp3`);
  const tmpSubs = path.join(tmpdir(), `tts-${Date.now()}.vtt`);

  // Write text to temp file to avoid shell injection
  const tmpTxt = path.join(tmpdir(), `tts-${Date.now()}.txt`);
  await writeFile(tmpTxt, text, "utf8");

  try {
    await execFileAsync("edge-tts", [
      "--voice", voice,
      "--text", text,
      "--write-media", tmpMp3,
      "--write-subtitles", tmpSubs,
    ], { timeout: 8000 });

    const buffer = await readFile(tmpMp3);

    // Rough duration estimate: 150 words/min average for Indian English
    const words    = text.trim().split(/\s+/).length;
    const duration = Math.max(5, Math.ceil((words / 150) * 60));

    return { buffer, duration };
  } finally {
    await Promise.allSettled([unlink(tmpMp3), unlink(tmpSubs), unlink(tmpTxt)].map((p) => p.catch(() => {})));
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId, jobId } = await req.json();
  await markJobRunning(jobId);

  try {
    const { data: story } = await supabase.from("stories").select("language").eq("id", storyId).single();
    const voice = VOICE_MAP[story?.language ?? "en"];

    const { data: scenes } = await supabase
      .from("scenes")
      .select("id, scene_order, narration")
      .eq("story_id", storyId)
      .order("scene_order");

    if (!scenes?.length) throw new Error("No scenes found");

    await updateStoryStatus(storyId, "audio");

    // Process sequentially — Vercel serverless has 512 MB RAM limit
    for (const scene of scenes) {
      const { buffer, duration } = await synthesize(scene.narration, voice);
      const key   = `stories/${storyId}/audio/scene-${String(scene.scene_order).padStart(3, "0")}.mp3`;
      const r2Url = await uploadToR2(key, buffer, "audio/mpeg");

      await supabase
        .from("scenes")
        .update({ audio_url: r2Url, duration, status: "audio_done" })
        .eq("id", scene.id);
    }

    await updateStoryStatus(storyId, "audied");
    await markJobDone(jobId);

    const nextJobId = await createJob("render-video", storyId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    void fetch(`${appUrl}/api/jobs/render-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ storyId, jobId: nextJobId }),
    });

    await notify("success", "Audio done", `${scenes.length} audio clips for story ${storyId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobFailed(jobId, msg);
    await updateStoryStatus(storyId, "failed");
    await notify("error", "generate-audio failed", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
