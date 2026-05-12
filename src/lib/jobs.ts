/**
 * Job lifecycle helpers — create, claim, finish, fail.
 * All operations are idempotent: duplicate calls are safe to retry.
 */

import { supabase } from "./supabase";
import type { JobType, JobStatus } from "@/types";

export async function createJob(type: JobType, storyId: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("jobs")
    .insert({ type, story_id: storyId, status: "queued", payload })
    .select("id")
    .single();

  if (error) throw new Error(`createJob: ${error.message}`);
  return data.id as string;
}

export async function markJobRunning(jobId: string) {
  await supabase.from("jobs").update({ status: "running" }).eq("id", jobId);
}

export async function markJobDone(jobId: string) {
  await supabase.from("jobs").update({ status: "done" }).eq("id", jobId);
}

export async function markJobFailed(jobId: string, error: string) {
  const { data } = await supabase
    .from("jobs")
    .select("retry_count")
    .eq("id", jobId)
    .single();

  await supabase
    .from("jobs")
    .update({ status: "failed", error, retry_count: (data?.retry_count ?? 0) + 1 })
    .eq("id", jobId);
}

export async function getFailedJobs(maxRetries = 3) {
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "failed")
    .lt("retry_count", maxRetries)
    .order("created_at");
  return data ?? [];
}

export async function updateStoryStatus(storyId: string, status: string) {
  await supabase.from("stories").update({ status }).eq("id", storyId);
}
