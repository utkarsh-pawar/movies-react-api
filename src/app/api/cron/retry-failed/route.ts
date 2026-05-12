/**
 * Runs every 6 hours. Re-queues failed jobs that haven't exceeded maxRetries.
 */

import { NextRequest, NextResponse } from "next/server";
import { getFailedJobs } from "@/lib/jobs";
import type { Job } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 10;

const JOB_ENDPOINTS: Record<string, string> = {
  "generate-script": "/api/jobs/generate-script",
  "generate-images": "/api/jobs/generate-images",
  "generate-audio":  "/api/jobs/generate-audio",
  "render-video":    "/api/jobs/render-video",
  "upload-youtube":  "/api/jobs/upload-youtube",
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const failed: Job[] = await getFailedJobs(3) as Job[];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  for (const job of failed.slice(0, 5)) {  // cap at 5 retries per cron run
    const endpoint = JOB_ENDPOINTS[job.type];
    if (!endpoint) continue;
    void fetch(`${appUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ storyId: job.story_id, jobId: job.id, ...(job.payload ?? {}) }),
    });
  }

  return NextResponse.json({ retried: failed.length });
}
