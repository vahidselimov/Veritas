import { NextResponse } from 'next/server';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

const FALLBACK_SUMMARIES = [
  {
    id: 'cuda_kernel',
    name: 'cuda_kernel.pdf',
    filePath: 'uploads/cuda_kernel.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 3250585,
    totalPages: 18,
    checksum: 'sha256_8fa2b9c71e4d3a01',
    status: 'indexed',
    chunkCount: 342,
    columnCount: 1,
    totalCharacters: 18420,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'architecture_v2',
    name: 'architecture_v2.pdf',
    filePath: 'uploads/architecture_v2.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 4404019,
    totalPages: 42,
    checksum: 'sha256_a1b2c3d4e5f60718',
    status: 'indexed',
    chunkCount: 710,
    columnCount: 2,
    totalCharacters: 41200,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rfc_9110',
    name: 'rfc_9110.pdf',
    filePath: 'uploads/rfc_9110.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1887436,
    totalPages: 165,
    checksum: 'sha256_f9e8d7c6b5a43210',
    status: 'indexed',
    chunkCount: 1890,
    columnCount: 1,
    totalCharacters: 94100,
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${CORE_API_URL}/api/v1/documents/summary`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback when .NET API is on standby
  }

  return NextResponse.json(FALLBACK_SUMMARIES);
}
