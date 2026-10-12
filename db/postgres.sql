CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  website_url text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL,
  topic text NOT NULL,
  topics text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','active','upcoming','expired','rejected')),
  deadline timestamptz,
  format text NOT NULL CHECK (format IN ('Online','In-person','Hybrid')),
  location text NOT NULL,
  eligibility text[] NOT NULL,
  eligibility_groups text[] NOT NULL DEFAULT '{}',
  cost text NOT NULL,
  prize_amount numeric(14,2),
  benefit text NOT NULL,
  official_url text NOT NULL UNIQUE,
  source_name text NOT NULL,
  verified_at timestamptz,
  team_allowed boolean,
  solo_allowed boolean,
  beginner_friendly boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  trending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_status_deadline_idx ON opportunities(status, deadline);
CREATE INDEX IF NOT EXISTS opportunities_type_idx ON opportunities(type);
CREATE INDEX IF NOT EXISTS opportunities_topic_idx ON opportunities(topic);
CREATE INDEX IF NOT EXISTS opportunities_search_idx ON opportunities USING gin(to_tsvector('english', title || ' ' || summary));

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_key text UNIQUE,
  age_or_grade text,
  location text,
  interests text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  online_only boolean NOT NULL DEFAULT false,
  free_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity_tracking (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('saved','applied','completed')),
  reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  imported_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
