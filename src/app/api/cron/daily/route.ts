/**
 * Runs at 06:30 IST (01:00 UTC) via Vercel Cron.
 * Picks the next pending story and fires the generate-script job.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createJob } from "@/lib/jobs";
import { notify } from "@/lib/discord";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  // Vercel injects the CRON_SECRET in the Authorization header for cron routes
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pick one pending story
    const { data: story, error } = await supabase
      .from("stories")
      .select("id, name")
      .eq("status", "pending")
      .order("created_at")
      .limit(1)
      .single();

    if (error || !story) {
      await notify("info", "Daily cron: no pending stories", "Queue is empty — add more stories to Supabase.");
      return NextResponse.json({ message: "no pending stories" });
    }

    // Mark story as scripting and queue the first job
    await supabase.from("stories").update({ status: "scripting" }).eq("id", story.id);
    const jobId = await createJob("generate-script", story.id);

    // Fire the job endpoint asynchronously (fire-and-forget via fetch)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    void fetch(`${appUrl}/api/jobs/generate-script`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ storyId: story.id, jobId }),
    });

    await notify("info", `Started: ${story.name}`, `Job ${jobId} queued for generate-script`);
    return NextResponse.json({ storyId: story.id, jobId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await notify("error", "Daily cron failed", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
