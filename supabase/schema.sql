-- JK-Bot-MD: persistencia Premium en Supabase/PostgreSQL
-- El bot también crea estas tablas automáticamente al iniciar.

create table if not exists public.jkbot_premium_users (
  jid text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.jkbot_premium_tokens (
  token_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists jkbot_premium_users_updated_idx
  on public.jkbot_premium_users (updated_at);

create index if not exists jkbot_premium_tokens_updated_idx
  on public.jkbot_premium_tokens (updated_at);

-- Las operaciones del bot usan la cadena de conexión privada de PostgreSQL.
-- No expongas esa cadena en el navegador ni uses la anon key para este flujo.
