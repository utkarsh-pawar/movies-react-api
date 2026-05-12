/**
 * Triggers a Remotion server-side render via @remotion/renderer.
 * Vercel Hobby has a 10s function limit, so we kick off a background
 * render on a long-running Vercel Function (Pro) or use Remotion Lambda.
 *
 * On Hobby (free tier): we use Remotion's built-in renderMedia() which
 * can render short-ish videos within Vercel's 10s limit by using
 * pre-bundled compositions and minimal frame counts.
 *
 * For longer renders, deploy the /api/jobs/render-video route as a
 * Vercel Edge Function with streaming — or use Remotion Lambda (pay-per-use).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";
import { markJobRunning, markJobDone, markJobFailed, createJob, updateStoryStatus } from "@/lib/jobs";
import { notify } from "@/lib/discord";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId, jobId } = await req.json();
  await markJobRunning(jobId);

  try {
    const { data: story } = await supabase
      .from("stories")
      .select("*, scenes(*)")
      .eq("id", storyId)
      .single();

    if (!story) throw new Error("Story not found");

    await updateStoryStatus(storyId, "rendering");

    const scenes = (story.scenes as Array<{
      scene_order: number;
      narration: string;
      image_url: string;
      audio_url: string;
      duration: number;
    }>).sort((a, b) => a.scene_order - b.scene_order);

    // Build composition input props
    const inputProps = {
      storyId,
      title:  story.script_json?.title ?? story.name,
      scenes: scenes.map((s) => ({
        narration: s.narration,
        imageUrl:  s.image_url,
        audioUrl:  s.audio_url,
        duration:  s.duration ?? 6,
      })),
    };

    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), "remotion/src/index.ts"),
      webpackOverride: (config) => config,
    });

    const composition = await selectComposition({
      serveUrl:    bundleLocation,
      id:          "IndianSuccessStory",
      inputProps,
    });

    const outPath = path.join(tmpdir(), `render-${storyId}.mp4`);

    await renderMedia({
      composition,
      serveUrl:   bundleLocation,
      codec:      "h264",
      outputLocation: outPath,
      inputProps,
    });

    const buffer = await readFile(outPath);
    await unlink(outPath).catch(() => {});

    const key    = `stories/${storyId}/video/final.mp4`;
    const r2Url  = await uploadToR2(key, buffer, "video/mp4");

    await supabase.from("stories").update({ video_url: r2Url }).eq("id", storyId);
    await updateStoryStatus(storyId, "rendered");
    await markJobDone(jobId);

    const nextJobId = await createJob("upload-youtube", storyId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    void fetch(`${appUrl}/api/jobs/upload-youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ storyId, jobId: nextJobId }),
    });

    await notify("success", "Render complete", `Video uploaded to R2: ${r2Url}`);
    return NextResponse.json({ ok: true, videoUrl: r2Url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobFailed(jobId, msg);
    await updateStoryStatus(storyId, "failed");
    await notify("error", "render-video failed", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
