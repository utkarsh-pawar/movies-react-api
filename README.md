# Indian Success Stories — Automated YouTube Pipeline

Fully automated, faceless YouTube channel that generates 3 Hindi/English videos per week narrating Indian entrepreneur success stories. Runs entirely on free tiers and deploys to Vercel.

---

## Architecture

```
Vercel Cron (6:30 AM IST)
  → /api/cron/daily
  → /api/jobs/generate-script  (Gemini / Groq)
  → /api/jobs/generate-images  (Pollinations.ai)
  → /api/jobs/generate-audio   (Edge TTS)
  → /api/jobs/render-video     (Remotion)
  → /api/jobs/upload-youtube   (YouTube Data API v3)
  → Discord webhook (notify)
```

Every job is idempotent and retried by `/api/cron/retry-failed` every 6 hours.

---

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** → run `supabase/migrations/001_initial_schema.sql`.
3. Copy **Project URL** and **service_role key** from Settings → API.

### 2. Upstash Redis

1. Create a free database at [upstash.com](https://upstash.com).
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### 3. Cloudflare R2

1. Create a free account at [cloudflare.com](https://cloudflare.com).
2. R2 → Create bucket → name it `indian-success-stories`.
3. Settings → R2 API Tokens → Create token with **Object Read & Write**.
4. Enable **Public Access** on the bucket → copy the public URL.

### 4. AI — Gemini (recommended, free)

1. Get API key at [aistudio.google.com](https://aistudio.google.com) — free tier.
2. Set `GEMINI_API_KEY` and `SCRIPT_LLM_PROVIDER=gemini`.

**OR Groq (also free):**
1. Get key at [console.groq.com](https://console.groq.com).
2. Set `GROQ_API_KEY` and `SCRIPT_LLM_PROVIDER=groq`.

### 5. YouTube OAuth 2.0 (refresh token)

```bash
# One-time setup to obtain a refresh token
npx ts-node scripts/get-youtube-token.ts
```

Or use the [OAuth Playground](https://developers.google.com/oauthplayground):

1. Google Cloud Console → New project → Enable **YouTube Data API v3**.
2. OAuth consent screen → External → add your email.
3. Credentials → OAuth 2.0 Client ID → Desktop app.
4. OAuth Playground → set scope `https://www.googleapis.com/auth/youtube.upload`.
5. Exchange code for refresh token → copy `refresh_token`.

### 6. Discord Webhook

1. Discord server → Channel settings → Integrations → Webhooks → New.
2. Copy the webhook URL.

### 7. Music Files

Place three royalty-free MP3s in `public/music/`:
- `intro.mp3` — 5 seconds branded jingle
- `outro.mp3` — 5 seconds subscribe jingle  
- `background-bed.mp3` — loopable ambient track

Sources: [pixabay.com/music](https://pixabay.com/music), [freepd.com](https://freepd.com)

### 8. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all `.env.example` variables in **Vercel → Settings → Environment Variables**.

The two cron jobs in `vercel.json` activate automatically on Vercel Hobby.

---

## Local Development

```bash
cp .env.example .env.local
# fill in real values

npm install
npm run dev

# Preview Remotion composition
npm run remotion:preview
```

---

## Adding New Stories

Insert directly into Supabase:

```sql
INSERT INTO stories (name, slug, origin, achievement, language)
VALUES ('Azim Premji', 'azim-premji', 'Mumbai', 'transformed Wipro into an IT giant', 'en');
```

Or use the dashboard at `https://your-project.vercel.app`.

---

## Locked Brand Style

| Element | Value |
|---------|-------|
| Image style | hand-drawn 2D illustration, warm earth tones, paper texture, watercolor shading |
| Color palette | `#C65D3A` terracotta · `#F5E6D3` cream · `#1E3A5F` deep blue |
| Fonts | Poppins (titles) · Hind (Hindi text) |
| Voice EN | `en-IN-PrabhatNeural` |
| Voice HI | `hi-IN-MadhurNeural` |
| Seed | `42` (all Pollinations images) |
| Resolution | 1920×1080, H.264 |
| Publish time | 7 PM IST daily |

---

## Free Tier Limits

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Vercel Hobby | 100 GB bandwidth, 2 crons | ✅ |
| Supabase | 500 MB DB, 2 GB storage | ✅ |
| Upstash Redis | 10,000 commands/day | ✅ |
| Cloudflare R2 | 10 GB, zero egress | ✅ |
| Gemini 1.5 Flash | 15 RPM free | ✅ |
| Pollinations.ai | Unlimited free | ✅ |
| Edge TTS | Unlimited free | ✅ |
| YouTube Data API | 10,000 units/day | ✅ |

---

## File Tree

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   ├── daily/route.ts
│   │   │   │   └── retry-failed/route.ts
│   │   │   ├── jobs/
│   │   │   │   ├── generate-script/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── gemini.ts
│   │   │   │   │   ├── groq.ts
│   │   │   │   │   └── prompt.ts
│   │   │   │   ├── generate-images/route.ts
│   │   │   │   ├── generate-audio/route.ts
│   │   │   │   ├── render-video/route.ts
│   │   │   │   └── upload-youtube/route.ts
│   │   │   └── webhooks/
│   │   │       └── discord/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── redis.ts
│   │   ├── r2.ts
│   │   ├── discord.ts
│   │   └── jobs.ts
│   └── types/index.ts
├── remotion/
│   └── src/
│       ├── index.ts
│       ├── Root.tsx
│       ├── compositions/
│       │   └── Video.tsx
│       └── components/
│           ├── Scene.tsx
│           ├── Intro.tsx
│           └── Outro.tsx
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
│   └── music/          ← place intro.mp3, outro.mp3, background-bed.mp3 here
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── vercel.json
```
