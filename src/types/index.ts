export type StoryStatus =
  | "pending" | "scripting" | "scripted" | "imaging" | "imaged"
  | "audio" | "audied" | "rendering" | "rendered" | "uploading"
  | "done" | "failed";

export type JobType =
  | "generate-script" | "generate-images" | "generate-audio"
  | "render-video"    | "upload-youtube";

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Story {
  id: string;
  name: string;
  slug: string;
  origin: string | null;
  achievement: string | null;
  language: "en" | "hi";
  status: StoryStatus;
  script_json: ScriptJson | null;
  video_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SceneRecord {
  id: string;
  story_id: string;
  scene_order: number;
  narration: string;
  image_prompt: string;
  image_url: string | null;
  audio_url: string | null;
  duration: number | null;
  status: "pending" | "image_done" | "audio_done" | "done" | "failed";
  created_at: string;
}

export interface Job {
  id: string;
  type: JobType;
  story_id: string;
  status: JobStatus;
  error: string | null;
  retry_count: number;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ── Script JSON schema (from LLM) ─────────────────────────────────────────────
export interface ScriptScene {
  id: number;
  narration: string;
  imagePrompt: string;
  duration: number;        // seconds
}

export interface ScriptJson {
  title: string;
  hook: string;
  scenes: ScriptScene[];
  cta: string;
}
