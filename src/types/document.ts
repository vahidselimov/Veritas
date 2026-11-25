export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LineBoundingBox extends BoundingBox {
  charStart: number;
  charEnd: number;
}

export interface DocumentChunkDto {
  id: string;
  documentId: string;
  chunkIndex: number;
  readingOrder: number;
  columnIndex: number;
  charStartIndex: number;
  charEndIndex: number;
  blockType: string;
  pageNumber: number;
  content: string;
  bbox: BoundingBox;
  lineBboxes?: LineBoundingBox[];
  tokenCount: number;
}

export interface CoordinateCacheDto {
  documentId: string;
  pageNumber: number | null;
  cacheHit: boolean;
  lookupMs: number;
  columnCount: number;
  totalCharacters: number;
  chunks: DocumentChunkDto[];
}

export interface DocumentSummaryDto {
  id: string;
  name: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  totalPages: number;
  checksum: string;
  status: string;
  chunkCount: number;
  columnCount: number;
  totalCharacters: number;
  createdAt: string;
}
