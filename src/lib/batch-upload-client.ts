import type { BatchIngestionResponse } from '@/types/document';

export async function uploadDocumentsBatch(
  files: FileList | File[]
): Promise<BatchIngestionResponse> {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) {
    throw new Error('No files selected.');
  }

  const formData = new FormData();
  for (const file of fileArray) {
    formData.append('files', file);
  }

  const res = await fetch('/api/v1/documents/upload-batch', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Batch upload failed (${res.status})`);
  }

  return res.json();
}
