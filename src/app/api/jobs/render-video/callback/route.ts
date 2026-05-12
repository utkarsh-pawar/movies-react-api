/**
 * Called by GitHub Actions after the Remotion render completes.
 * Receives the R2 video URL and chains to upload-youtube.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { markJobDone, markJobFailed, createJob, updateStoryStatus } from "@/lib/jobs";
import { notify } from "@/lib/discord";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId, jobId, videoUrl, error } = await req.json();

  if (error) {
    await markJobFailed(jobId, error);
    await updateStoryStatus(storyId, "failed");
    await notify("error", "Render failed (GitHub Actions)", error);
    return NextResponse.json({ ok: false });
  }

  await supabase.from("stories").update({ video_url: videoUrl }).eq("id", storyId);
  await updateStoryStatus(storyId, "rendered");
  await markJobDone(jobId);

  const nextJobId = await createJob("upload-youtube", storyId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  void fetch(`${appUrl}/api/jobs/upload-youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ storyId, jobId: nextJobId }),
  });

  await notify("success", "Render complete", `Video at: ${videoUrl}`);
  return NextResponse.json({ ok: true });
}
