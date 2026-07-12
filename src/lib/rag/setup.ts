import 'dotenv/config';
import { prisma } from '../prisma';

const SQL = `
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
`;

const MATCH_FN = `
CREATE OR REPLACE FUNCTION match_documents(
  query_text text,
  match_threshold float,
  match_count int,
  p_garage_id UUID
)
RETURNS TABLE(
  id UUID,
  entity_type TEXT,
  entity_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  qvec vector(384);
BEGIN
  qvec := query_text::vector(384);
  RETURN QUERY
  SELECT
    de.id,
    de.entity_type,
    de.entity_id,
    de.content,
    de.metadata,
    1 - (de.embedding <=> qvec) AS similarity
  FROM doc_embeddings de
  WHERE de.garage_id = p_garage_id
    AND de.embedding IS NOT NULL
    AND 1 - (de.embedding <=> qvec) > match_threshold
  ORDER BY de.embedding <=> qvec
  LIMIT match_count;
END;
$$;
`;

const FTS_FN = `
CREATE OR REPLACE FUNCTION search_documents_fts(
  search_query text,
  p_garage_id UUID,
  max_results int DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  entity_type TEXT,
  entity_id TEXT,
  content TEXT,
  metadata JSONB,
  rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.entity_type,
    de.entity_id,
    de.content,
    de.metadata,
    ts_rank(to_tsvector('french', de.content), plainto_tsquery('french', search_query))::float AS rank
  FROM doc_embeddings de
  WHERE de.garage_id = p_garage_id
    AND to_tsvector('french', de.content) @@ plainto_tsquery('french', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$;
`;

export async function setupPgVector() {
  await prisma.$executeRawUnsafe(SQL);
  console.log('✅ pgvector extension + doc_embeddings table ready');
}

export async function createFunctions() {
  await prisma.$executeRawUnsafe(MATCH_FN);
  console.log('✅ match_documents function created');
  await prisma.$executeRawUnsafe(FTS_FN);
  console.log('✅ search_documents_fts function created');
}

export async function tearDown() {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS public.doc_embeddings CASCADE;');
  console.log('🗑️  doc_embeddings dropped');
}

async function main() {
  const action = process.argv[2];
  if (action === 'drop') {
    await tearDown();
  } else {
    await setupPgVector();
    await createFunctions();
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
