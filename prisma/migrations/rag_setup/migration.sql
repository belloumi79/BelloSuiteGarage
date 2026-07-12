CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS public.doc_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_entity_type CHECK (entity_type IN ('client', 'vehicle', 'document', 'item'))
);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_garage ON public.doc_embeddings(garage_id);
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_entity ON public.doc_embeddings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_vector ON public.doc_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
