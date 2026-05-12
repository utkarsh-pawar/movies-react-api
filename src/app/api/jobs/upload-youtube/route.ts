/**
 * Downloads the rendered MP4 from R2 and uploads to YouTube using
 * googleapis with an OAuth refresh token (offline access).
 * Schedules the video to publish at 7 PM IST (13:30 UTC).
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { supabase } from "@/lib/supabase";
import { markJobRunning, markJobDone, markJobFailed, updateStoryStatus } from "@/lib/jobs";
import { notify } from "@/lib/discord";

export const runtime = "nodejs";
export const maxDuration = 10;

function getNextPublishTime(): string {
  // Next 7 PM IST (UTC+5:30 = 13:30 UTC)
  const now = new Date();
  const publish = new Date(now);
  publish.setUTCHours(13, 30, 0, 0);
  if (publish <= now) publish.setDate(publish.getDate() + 1);
  return publish.toISOString();
}

function buildDescription(name: string, origin: string | null, achievement: string | null): string {
  return `
${name} — an extraordinary journey from ${origin ?? "humble beginnings"} to ${achievement ?? "greatness"}.

In this video, we narrate the inspiring success story of ${name}, one of India's greatest icons.

👇 Watch more Indian Success Stories on this channel!

📌 Tags: #IndianSuccessStory #Motivation #${name.replace(/\s+/g, "")} #India #Entrepreneur

──────────────────────────────────────────
🔔 Subscribe & hit the bell for weekly stories!
`.trim();
}

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
      .select("*")
      .eq("id", storyId)
      .single();

    if (!story) throw new Error("Story not found");
    if (!story.video_url) throw new Error("No video_url — render step may have failed");

    await updateStoryStatus(storyId, "uploading");

    // Set up OAuth client
    const oauth2 = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET
    );
    oauth2.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

    const youtube = google.youtube({ version: "v3", auth: oauth2 });

    // Stream video from R2 → YouTube (avoids loading entire file into memory)
    const videoRes = await fetch(story.video_url);
    if (!videoRes.ok) throw new Error(`R2 fetch failed: ${videoRes.status}`);
    const videoStream = Readable.fromWeb(videoRes.body as import("stream/web").ReadableStream);

    const titleFormat = `${story.name} - From ${story.origin ?? "India"} to ${story.achievement ?? "Success"} | Indian Success Story`;

    const uploadRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title:       titleFormat.slice(0, 100),
          description: buildDescription(story.name, story.origin, story.achievement),
          tags: [
            "Indian success story", "motivation", "entrepreneur", story.name,
            "India", "business", "inspiration", "Hindi", "faceless channel",
          ],
          categoryId:  "22",  // People & Blogs
          defaultLanguage: story.language === "hi" ? "hi" : "en",
        },
        status: {
          privacyStatus:      "private",   // auto-published at scheduledStartTime
          publishAt:          getNextPublishTime(),
          selfDeclaredMadeForKids: false,
        },
      },
      media: { mimeType: "video/mp4", body: videoStream },
    });

    const youtubeId = uploadRes.data.id!;
    await supabase.from("stories").update({ youtube_id: youtubeId, status: "done" }).eq("id", storyId);
    await markJobDone(jobId);

    await notify(
      "success",
      `Uploaded: ${story.name}`,
      `YouTube ID: ${youtubeId}\nhttps://www.youtube.com/watch?v=${youtubeId}`
    );
    return NextResponse.json({ ok: true, youtubeId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobFailed(jobId, msg);
    await updateStoryStatus(storyId, "failed");
    await notify("error", "upload-youtube failed", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
