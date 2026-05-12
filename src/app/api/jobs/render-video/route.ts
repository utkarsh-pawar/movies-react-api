/**
 * Triggers a Remotion render via dynamic import (avoids webpack bundling
 * native @rspack binaries at Next.js build time).
 *
 * On Vercel Hobby the 10s limit means we can't complete a full render here.
 * Instead we trigger a GitHub Actions workflow via repository_dispatch which
 * does the heavy render for free (2000 min/month on GitHub free tier),
 * then POSTs back to /api/jobs/render-video/callback with the R2 URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { markJobRunning, markJobDone, markJobFailed, createJob, updateStoryStatus } from "@/lib/jobs";
import { notify } from "@/lib/discord";

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
      .select("id, name, script_json")
      .eq("id", storyId)
      .single();

    if (!story) throw new Error("Story not found");

    const { data: scenes } = await supabase
      .from("scenes")
      .select("scene_order, narration, image_url, audio_url, duration")
      .eq("story_id", storyId)
      .order("scene_order");

    if (!scenes?.length) throw new Error("No scenes found");

    await updateStoryStatus(storyId, "rendering");

    // Trigger GitHub Actions workflow to do the actual render
    // (free 2000 min/month — no Vercel function timeout issue)
    const ghToken = process.env.GITHUB_TOKEN;
    const ghRepo  = process.env.GITHUB_REPO; // e.g. "utkarsh-pawar/movies-react-api"

    if (ghToken && ghRepo) {
      const dispatchRes = await fetch(
        `https://api.github.com/repos/${ghRepo}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ghToken}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            event_type: "render-video",
            client_payload: {
              storyId,
              jobId,
              title:  story.script_json?.title ?? story.name,
              scenes: scenes.map((s) => ({
                narration: s.narration,
                imageUrl:  s.image_url,
                audioUrl:  s.audio_url,
                duration:  s.duration ?? 6,
              })),
              callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/render-video/callback`,
              callbackSecret: process.env.CRON_SECRET,
            },
          }),
        }
      );

      if (!dispatchRes.ok) {
        const text = await dispatchRes.text();
        throw new Error(`GitHub dispatch failed [${dispatchRes.status}]: ${text}`);
      }

      await notify(
        "info",
        `Render dispatched: ${story.name}`,
        "GitHub Actions will render and upload to R2, then call back."
      );

      // Job stays "running" until the callback marks it done
      return NextResponse.json({ ok: true, dispatched: true });
    }

    // Fallback: mark as failed with a helpful message if GitHub is not configured
    throw new Error(
      "GITHUB_TOKEN / GITHUB_REPO not set. " +
      "Add them to env vars and create .github/workflows/render.yml — see README."
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobFailed(jobId, msg);
    await updateStoryStatus(storyId, "failed");
    await notify("error", "render-video failed", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
