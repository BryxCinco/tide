CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS embeddings_vector_idx
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS embeddings_user_id_idx ON embeddings(user_id);

CREATE INDEX IF NOT EXISTS embeddings_source_idx
  ON embeddings(user_id, source_type, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS embeddings_unique_source
  ON embeddings(user_id, source_type, source_id);

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own embeddings" ON embeddings;
CREATE POLICY "Users can CRUD own embeddings"
  ON embeddings FOR ALL USING (auth.uid() = user_id);
