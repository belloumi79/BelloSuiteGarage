import { prisma } from '../prisma';

export interface SearchResult {
  id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
  rank?: number;
}

export async function searchVector(
  queryEmbedding: number[],
  garageId: string,
  threshold = 0.5,
  maxResults = 10
): Promise<SearchResult[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const rows = await prisma.$queryRawUnsafe<SearchResult[]>(
    `SELECT * FROM match_documents($1::text, $2::float, $3::int, $4::uuid)`,
    embeddingStr,
    threshold,
    maxResults,
    garageId
  );
  return rows;
}

export async function searchFullText(
  query: string,
  garageId: string,
  maxResults = 10
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRawUnsafe<SearchResult[]>(
    `SELECT * FROM search_documents_fts($1::text, $2::uuid, $3::int)`,
    query,
    garageId,
    maxResults
  );
  return rows;
}

export async function removeEntityEmbeddings(
  entityType: string,
  entityId: string
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM doc_embeddings WHERE entity_type = $1 AND entity_id = $2`,
    entityType,
    entityId
  );
}
