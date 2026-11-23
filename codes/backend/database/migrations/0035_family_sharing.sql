-- Growth pass 2026-11-23, Track 2 item 2: family sharing (tier feature `family_sharing`). The owner of a profile lets
-- another account read its plan; the other account never edits it. Removing the row ends the access at once.
CREATE TABLE profile_shares (
  profile_id integer NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  -- the account the profile is shared with
  user_id    integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, user_id)
);
CREATE INDEX profile_shares_user_idx ON profile_shares (user_id);
