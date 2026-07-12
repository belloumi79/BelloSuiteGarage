export interface RagDocument {
  id: string;
  entity_type: 'client' | 'vehicle' | 'document' | 'item';
  entity_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
  rank?: number;
}

export interface IndexableEntity {
  type: RagDocument['entity_type'];
  id: string;
  garage_id: string;
  text: string;
  metadata: Record<string, unknown>;
}
