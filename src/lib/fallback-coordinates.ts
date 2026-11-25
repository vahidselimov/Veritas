import type { CoordinateCacheDto, DocumentChunkDto } from '@/types/document';

export function buildFallbackChunks(documentId: string, pageNumber?: number | null): DocumentChunkDto[] {
  const page = pageNumber ?? 4;
  const c1 =
    'By bypassing the standard runtime pinned memory allocations through unified virtual memory addressing and custom ring-buffer pools...';
  const c2 =
    'Furthermore, asynchronous Direct Memory Access (DMA) transfers are directly mapped into contiguous physical host registers...';

  return [
    {
      id: 'chunk-1',
      documentId,
      chunkIndex: 0,
      readingOrder: 0,
      columnIndex: 0,
      charStartIndex: 0,
      charEndIndex: c1.length,
      blockType: 'paragraph',
      pageNumber: page,
      content: c1,
      bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.12 },
      lineBboxes: [{ x: 0.08, y: 0.28, w: 0.84, h: 0.12, charStart: 0, charEnd: c1.length }],
      tokenCount: 42,
    },
    {
      id: 'chunk-2',
      documentId,
      chunkIndex: 1,
      readingOrder: 1,
      columnIndex: 0,
      charStartIndex: c1.length + 1,
      charEndIndex: c1.length + 1 + c2.length,
      blockType: 'paragraph',
      pageNumber: page,
      content: c2,
      bbox: { x: 0.08, y: 0.44, w: 0.84, h: 0.14 },
      lineBboxes: [
        {
          x: 0.08,
          y: 0.44,
          w: 0.84,
          h: 0.14,
          charStart: c1.length + 1,
          charEnd: c1.length + 1 + c2.length,
        },
      ],
      tokenCount: 48,
    },
  ];
}

export function buildFallbackCoordinateResult(
  documentId: string,
  pageNumber?: number | null
): CoordinateCacheDto {
  const chunks = buildFallbackChunks(documentId, pageNumber);
  const totalCharacters = chunks.length > 0 ? chunks[chunks.length - 1].charEndIndex : 0;

  return {
    documentId,
    pageNumber: pageNumber ?? null,
    cacheHit: false,
    lookupMs: 0.42,
    columnCount: 1,
    totalCharacters,
    chunks,
  };
}
