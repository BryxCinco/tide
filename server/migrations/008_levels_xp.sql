-- Phase 12.1 Fix 5: Levels + XP system.
CREATE TABLE IF NOT EXISTS user_levels (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own level"
  ON user_levels FOR ALL USING (auth.uid() = user_id);

-- handle_new_user() already creates profiles/user_settings/streaks rows together on signup
-- (see 003_google_oauth_profile_trigger.sql) — extended here rather than adding a second
-- trigger, since that's the one place new-account rows for every other per-user table
-- already get created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );

  INSERT INTO public.user_settings (user_id) VALUES (new.id);
  INSERT INTO public.streaks (user_id) VALUES (new.id);
  INSERT INTO public.user_levels (user_id) VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill accounts that signed up before this migration existed.
INSERT INTO public.user_levels (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
