import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  timestamp,
  jsonb,
  vector,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom tsvector type for PostgreSQL full-text search
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export interface BoundingBox {
  x: number; // 0.0 - 1.0 (relative to page width)
  y: number; // 0.0 - 1.0 (relative to page height)
  w: number; // 0.0 - 1.0 (relative width)
  h: number; // 0.0 - 1.0 (relative height)
}

// 1. Documents Table
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull().default('application/pdf'),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
  totalPages: integer('total_pages').notNull().default(1),
  checksum: text('checksum').notNull(),
  status: text('status').notNull().default('indexed'), // 'uploading' | 'processing' | 'indexed' | 'failed'
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Document Chunks Table (Grounded Bounding Boxes + Vector + BM25)
export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    pageNumber: integer('page_number').notNull(),
    content: text('content').notNull(),
    // Normalized Bounding Box { x, y, w, h }
    bbox: jsonb('bbox').$type<BoundingBox>().notNull(),
    tokenCount: integer('token_count').notNull(),
    // 1536-dimensional vector for OpenAI text-embedding-3
    embedding: vector('embedding', { dimensions: 1536 }),
    // Full-text search tsvector generated column
    searchTsv: tsvector('search_tsv'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    embeddingHnswIdx: index('idx_chunks_embedding').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
    docPageIdx: index('idx_chunks_doc_page').on(table.documentId, table.pageNumber),
  })
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
