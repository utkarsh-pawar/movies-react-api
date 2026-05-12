-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── stories ───────────────────────────────────────────────────────────────────
create table if not exists stories (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  origin        text,
  achievement   text,
  language      text not null default 'en' check (language in ('en', 'hi')),
  status        text not null default 'pending'
                  check (status in ('pending','scripting','scripted','imaging',
                                    'imaged','audio','audied','rendering',
                                    'rendered','uploading','done','failed')),
  script_json   jsonb,
  video_url     text,
  youtube_id    text,
  thumbnail_url text,
  scheduled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── scenes ────────────────────────────────────────────────────────────────────
create table if not exists scenes (
  id            uuid primary key default uuid_generate_v4(),
  story_id      uuid not null references stories(id) on delete cascade,
  scene_order   int  not null,
  narration     text not null,
  image_prompt  text not null,
  image_url     text,
  audio_url     text,
  duration      numeric(6,2),
  status        text not null default 'pending'
                  check (status in ('pending','image_done','audio_done','done','failed')),
  created_at    timestamptz not null default now()
);
create index if not exists scenes_story_id_idx on scenes(story_id);
create index if not exists scenes_order_idx on scenes(story_id, scene_order);

-- ── jobs ──────────────────────────────────────────────────────────────────────
create table if not exists jobs (
  id            uuid primary key default uuid_generate_v4(),
  type          text not null
                  check (type in ('generate-script','generate-images',
                                  'generate-audio','render-video','upload-youtube')),
  story_id      uuid not null references stories(id) on delete cascade,
  status        text not null default 'queued'
                  check (status in ('queued','running','done','failed')),
  error         text,
  retry_count   int  not null default 0,
  payload       jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists jobs_story_status_idx on jobs(story_id, status);
create index if not exists jobs_type_status_idx on jobs(type, status);

-- ── seed: initial story queue ─────────────────────────────────────────────────
insert into stories (name, slug, origin, achievement, language) values
  ('Dhirubhai Ambani',  'dhirubhai-ambani',  'Chorwad village', 'built Reliance Industries', 'en'),
  ('Ratan Tata',        'ratan-tata',        'Mumbai',          'transformed Tata Group globally', 'en'),
  ('Falguni Nayar',     'falguni-nayar',     'Mumbai',          'built Nykaa at 49', 'en'),
  ('Narayana Murthy',   'narayana-murthy',   'Mysore',          'co-founded Infosys with Rs 10,000', 'en'),
  ('Kiran Mazumdar Shaw','kiran-mazumdar-shaw','Bangalore',      'built Biocon from a garage', 'en'),
  ('Ritesh Agarwal',    'ritesh-agarwal',    'Rayagada Odisha', 'founded OYO at 19', 'en'),
  ('Verghese Kurien',   'verghese-kurien',   'Kozhikode',       'created Amul and the White Revolution', 'en')
on conflict (slug) do nothing;

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger stories_updated_at before update on stories
  for each row execute function set_updated_at();

create trigger jobs_updated_at before update on jobs
  for each row execute function set_updated_at();
