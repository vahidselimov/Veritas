import { client, db } from './index';
import { documents, documentChunks } from './schema';
import { sql } from 'drizzle-orm';

function createDummyEmbedding(seed: number): number[] {
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < 1536; i++) {
    embedding[i] = Math.sin(seed + i * 0.1) * 0.05;
  }
  // L2 normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / norm);
}

async function seed() {
  console.log('--- VERITAS // CORPUS DATABASE SEEDING ---');

  // 1. pgvector extension təsdiqi
  console.log('1. Checking pgvector extension...');
  await client`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log('✓ Extension vector is active.');

  // 2. Mövcud test sənədini təmizlə və ya yenilə
  console.log('2. Seeding cuda_kernel.pdf document...');
  const existingDocs = await db.select().from(documents);
  let docId: string;

  const found = existingDocs.find((d) => d.name === 'cuda_kernel.pdf');
  if (found) {
    docId = found.id;
    console.log(`Document already exists with ID: ${docId}`);
  } else {
    const [newDoc] = await db
      .insert(documents)
      .values({
        name: 'cuda_kernel.pdf',
        filePath: 'uploads/cuda_kernel.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 3250585,
        totalPages: 18,
        checksum: 'sha256_8fa2b9c71e4d3a01',
        status: 'indexed',
        metadata: {
          author: 'Dr. E. Vance',
          institution: 'MIT CSAIL',
          reportNumber: 'TR-2024-4409',
        },
      })
      .returning();
    docId = newDoc.id;
    console.log(`✓ Inserted document with ID: ${docId}`);
  }

  // 3. Document chunks seeding (Exact BBox coordinates from Stitch design)
  console.log('3. Seeding grounded document chunks with BBox coordinates...');

  // Mövcud parçaları təmizləyirik ki, dublikat olmasın
  await db.delete(documentChunks).where(sql`${documentChunks.documentId} = ${docId}`);

  const rawChunks = [
    {
      chunkIndex: 112,
      pageNumber: 4,
      columnIndex: 0,
      readingOrder: 0,
      blockType: 'paragraph',
      content:
        'By bypassing the standard runtime pinned memory allocations through unified virtual memory addressing and custom ring-buffer pools, the CUDA host allocator completely eliminates runtime kernel page locking faults. In typical synchronous drivers, operating systems incur non-trivial TLB invalidation and mprotect overhead when pinning memory slabs.',
      bbox: {
        x: 0.07,
        y: 0.22,
        w: 0.86,
        h: 0.11,
      },
      tokenCount: 52,
    },
    {
      chunkIndex: 115,
      pageNumber: 4,
      columnIndex: 0,
      readingOrder: 1,
      blockType: 'paragraph',
      content:
        'Furthermore, asynchronous Direct Memory Access (DMA) transfers are directly mapped into contiguous physical host registers, ensuring predictable p99 throughput without TLB thrashing or PCI-e saturation bottlenecks during massive mini-batch pipelining.',
      bbox: {
        x: 0.07,
        y: 0.36,
        w: 0.86,
        h: 0.09,
      },
      tokenCount: 41,
    },
    {
      chunkIndex: 119,
      pageNumber: 4,
      columnIndex: 0,
      readingOrder: 2,
      blockType: 'paragraph',
      content:
        'Benchmarking on eight interconnected H100 SXM5 nodes demonstrates that zero-copy ring arbiter streaming achieves 98.4% of peak PCIe Gen5 line-rate bandwidth (62.8 GB/s), compared to only 71.2% observed in default unified memory drivers under heavy thrash conditions.',
      bbox: {
        x: 0.07,
        y: 0.51,
        w: 0.86,
        h: 0.10,
      },
      tokenCount: 47,
    },
  ];

  let cursor = 0;
  const chunksData = rawChunks.map((rc) => {
    const start = cursor;
    const end = start + rc.content.length;
    cursor = end + 1;
    return {
      documentId: docId,
      ...rc,
      charStartIndex: start,
      charEndIndex: end,
      lineBboxes: [{ ...rc.bbox, charStart: start, charEnd: end }],
      embedding: createDummyEmbedding(rc.chunkIndex),
    };
  });

  for (const chunk of chunksData) {
    await db.insert(documentChunks).values(chunk);
    console.log(`✓ Seeded chunk #${chunk.chunkIndex} [Page ${chunk.pageNumber}]`);
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
