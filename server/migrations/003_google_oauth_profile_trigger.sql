-- Run in Supabase SQL Editor. Fixes handle_new_user() so Google OAuth signups get a
-- profiles row too — it previously only read raw_user_meta_data->>'name', which
-- email/password signups have (see server/routes/auth.js's /signup) but Google accounts
-- don't; Supabase populates their metadata as `full_name` (and `avatar_url`, sometimes
-- `picture`) instead, so the INSERT got a null name and the profiles row never got
-- created for those accounts.
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

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
