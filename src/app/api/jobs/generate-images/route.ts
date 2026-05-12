/**
 * Generates images for all scenes via Pollinations.ai (free, no key).
 * Parallelized in batches of 3 to stay under the rate limit.
 * Each image is uploaded to R2 and the URL saved to the scene record.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";
import { markJobRunning, markJobDone, markJobFailed, createJob, updateStoryStatus } from "@/lib/jobs";
import { notify } from "@/lib/discord";

export const runtime = "nodejs";
export const maxDuration = 10;

const STYLE_PREFIX =
  "hand-drawn 2D illustration, warm earth tones (terracotta, cream, deep blue), " +
  "paper texture overlay, minimalist character design, soft watercolor shading, " +
  "flat backgrounds, 16:9 cinematic composition";

const POLLINATIONS = "https://image.pollinations.ai/prompt";

async function fetchAndUploadImage(sceneId: string, storyId: string, sceneOrder: number, imagePrompt: string) {
  const fullPrompt = encodeURIComponent(`${STYLE_PREFIX}, ${imagePrompt}`);
  const url = `${POLLINATIONS}/${fullPrompt}?seed=42&width=1920&height=1080&nologo=true`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Pollinations ${res.status} for scene ${sceneOrder}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const key    = `stories/${storyId}/images/scene-${String(sceneOrder).padStart(3, "0")}.jpg`;
  const r2Url  = await uploadToR2(key, buffer, "image/jpeg");

  await supabase
    .from("scenes")
    .update({ image_url: r2Url, status: "image_done" })
    .eq("id", sceneId);

  return r2Url;
}

async function batchProcess<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<unknown>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    await Promise.allSettled(chunk.map(fn));
    // Rate-limit gap: ~350ms between batches
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, 350));
    }
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
    const { data: scenes } = await supabase
      .from("scenes")
      .select("id, scene_order, image_prompt")
      .eq("story_id", storyId)
      .order("scene_order");

    if (!scenes?.length) throw new Error("No scenes found");

    await updateStoryStatus(storyId, "imaging");

    await batchProcess(scenes, 3, (scene) =>
      fetchAndUploadImage(scene.id, storyId, scene.scene_order, scene.image_prompt)
    );

    await updateStoryStatus(storyId, "imaged");
    await markJobDone(jobId);

    // Chain: generate-audio
    const nextJobId = await createJob("generate-audio", storyId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    void fetch(`${appUrl}/api/jobs/generate-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ storyId, jobId: nextJobId }),
    });

    await notify("success", "Images done", `${scenes.length} images generated for story ${storyId}`);
    return NextResponse.json({ ok: true, count: scenes.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobFailed(jobId, msg);
    await updateStoryStatus(storyId, "failed");
    await notify("error", "generate-images failed", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
