import { supabase } from "@/lib/supabase";
import type { Story } from "@/types";

async function getStories(): Promise<Story[]> {
  const { data } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as Story[];
}

const STATUS_COLOR: Record<string, string> = {
  pending:   "#6b7280",
  scripting: "#f59e0b",
  scripted:  "#f59e0b",
  imaging:   "#8b5cf6",
  imaged:    "#8b5cf6",
  audio:     "#3b82f6",
  audied:    "#3b82f6",
  rendering: "#06b6d4",
  rendered:  "#06b6d4",
  uploading: "#10b981",
  done:      "#22c55e",
  failed:    "#ef4444",
};

export default async function Dashboard() {
  const stories = await getStories();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontWeight: 800, fontSize: 36, marginBottom: 8 }}>
        🎬 Indian Success Stories
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: 40 }}>
        Automated YouTube pipeline — {stories.length} stories in queue
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {stories.map((story) => (
          <div
            key={story.id}
            style={{
              background:   "rgba(255,255,255,0.05)",
              border:       "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding:      "20px 24px",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontWeight: 700, fontSize: 20 }}>{story.name}</p>
              <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>
                {story.origin} · {story.language.toUpperCase()} · {new Date(story.created_at).toLocaleDateString()}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {story.youtube_id && (
                <a
                  href={`https://www.youtube.com/watch?v=${story.youtube_id}`}
                  target="_blank"
                  style={{
                    background: "#FF0000",
                    color:      "#fff",
                    padding:    "6px 16px",
                    borderRadius: 6,
                    fontSize:   13,
                    fontWeight: 600,
                  }}
                >
                  YouTube ↗
                </a>
              )}
              <span
                style={{
                  background:   STATUS_COLOR[story.status] + "22",
                  color:        STATUS_COLOR[story.status],
                  border:       `1px solid ${STATUS_COLOR[story.status]}44`,
                  padding:      "4px 12px",
                  borderRadius: 20,
                  fontSize:     13,
                  fontWeight:   600,
                  textTransform: "capitalize",
                }}
              >
                {story.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
