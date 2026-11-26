import { NextRequest, NextResponse } from 'next/server';
import { deleteCloudDocument, getCloudDocument } from '@/lib/cloud-store';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5000';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${CORE_API_URL}/api/v1/documents/${id}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback
  }

  const cloudDoc = getCloudDocument(id);
  if (cloudDoc) {
    return NextResponse.json(cloudDoc);
  }

  return NextResponse.json({
    id,
    name: id.endsWith('.pdf') ? id : `${id}.pdf`,
    totalPages: 18,
    status: 'indexed',
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${CORE_API_URL}/api/v1/documents/${id}`, {
      method: 'DELETE',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status < 500) {
      const data = await res.json().catch(() => ({ deleted: res.ok, id }));
      return NextResponse.json(data, { status: res.status });
    }
  } catch {
    // Fallback to cloud store
  }

  const removed = deleteCloudDocument(id);
  if (!removed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true, id });
}
