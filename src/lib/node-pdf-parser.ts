import crypto from 'node:crypto';
import type { DocumentChunkDto, LineBoundingBox } from '@/types/document';

interface TextRunBox {
  text: string;
  left: number;
  right: number;
  bottom: number;
  top: number;
  midY: number;
  height: number;
}

interface VisualLine {
  columnIndex: number;
  text: string;
  wordCount: number;
  left: number;
  right: number;
  bottom: number;
  top: number;
  medianHeight: number;
}

interface LayoutSegment {
  boxes: TextRunBox[];
  columnIndex: number;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

function computeMedian(values: number[]): number {
  if (values.length === 0) return 11.0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function findWidestYCut(boxes: TextRunBox[]): { found: boolean; cutY: number; gap: number } {
  const sorted = [...boxes].sort((a, b) => b.top - a.top);
  let coveredBottom = sorted[0].bottom;
  let bestGap = 0;
  let bestCutY = 0;

  for (let i = 1; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.top < coveredBottom) {
      const gap = coveredBottom - b.top;
      if (gap > bestGap) {
        bestGap = gap;
        bestCutY = b.top + gap / 2;
      }
      coveredBottom = b.bottom;
    } else if (b.bottom < coveredBottom) {
      coveredBottom = b.bottom;
    }
  }

  return { found: bestGap > 0.5, cutY: bestCutY, gap: bestGap };
}

function hasMultiLineContentOnBothSides(
  boxes: TextRunBox[],
  cutX: number,
  medianHeight: number
): boolean {
  const left = boxes.filter((b) => (b.left + b.right) / 2 <= cutX);
  const right = boxes.filter((b) => (b.left + b.right) / 2 > cutX);
  if (left.length < 2 || right.length < 2) return false;

  const leftSpanY = Math.max(...left.map((b) => b.top)) - Math.min(...left.map((b) => b.bottom));
  const rightSpanY = Math.max(...right.map((b) => b.top)) - Math.min(...right.map((b) => b.bottom));
  const leftSpanX = Math.max(...left.map((b) => b.right)) - Math.min(...left.map((b) => b.left));
  const rightSpanX = Math.max(...right.map((b) => b.right)) - Math.min(...right.map((b) => b.left));

  return (
    leftSpanY > medianHeight * 1.4 &&
    rightSpanY > medianHeight * 1.4 &&
    leftSpanX >= 105.0 &&
    rightSpanX >= 105.0
  );
}

function findWidestColumnGutter(
  boxes: TextRunBox[],
  minGutterWidth: number,
  medianHeight: number
): { found: boolean; cutX: number; gap: number } {
  const sorted = [...boxes].sort((a, b) => a.left - b.left);
  let coveredRight = sorted[0].right;
  let bestGap = 0;
  let bestCutX = 0;

  for (let i = 1; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.left > coveredRight) {
      const gap = b.left - coveredRight;
      if (gap >= minGutterWidth && gap > bestGap) {
        const candidateCutX = coveredRight + gap / 2;
        if (hasMultiLineContentOnBothSides(boxes, candidateCutX, medianHeight)) {
          bestGap = gap;
          bestCutX = candidateCutX;
        }
      }
      coveredRight = b.right;
    } else if (b.right > coveredRight) {
      coveredRight = b.right;
    }
  }

  return { found: bestGap >= minGutterWidth, cutX: bestCutX, gap: bestGap };
}

function partitionWithXyCut(
  boxes: TextRunBox[],
  medianHeight: number,
  columnStart: number
): LayoutSegment[] {
  if (boxes.length === 0) return [];
  if (boxes.length <= 2) {
    const sortedLeaf = [...boxes].sort((a, b) => {
      const band = Math.max(2.0, medianHeight * 0.5);
      const yDiff = Math.round(b.midY / band) - Math.round(a.midY / band);
      return yDiff !== 0 ? yDiff : a.left - b.left;
    });
    return [{ boxes: sortedLeaf, columnIndex: columnStart }];
  }

  const minY = Math.min(...boxes.map((b) => b.bottom));
  const maxY = Math.max(...boxes.map((b) => b.top));
  const regionHeight = maxY - minY;

  const gutterThreshold = Math.max(14.0, medianHeight * 1.35);
  const xCut =
    regionHeight > medianHeight * 2.1 && boxes.length >= 4
      ? findWidestColumnGutter(boxes, gutterThreshold, medianHeight)
      : { found: false, cutX: 0, gap: 0 };

  if (xCut.found) {
    const leftBoxes = boxes.filter((b) => (b.left + b.right) / 2 <= xCut.cutX);
    const rightBoxes = boxes.filter((b) => (b.left + b.right) / 2 > xCut.cutX);
    if (leftBoxes.length > 0 && rightBoxes.length > 0) {
      const leftSegs = partitionWithXyCut(leftBoxes, medianHeight, columnStart);
      const nextCol =
        leftSegs.length > 0 ? Math.max(...leftSegs.map((s) => s.columnIndex)) + 1 : columnStart + 1;
      const rightSegs = partitionWithXyCut(rightBoxes, medianHeight, nextCol);
      return [...leftSegs, ...rightSegs];
    }
  }

  const yCut = findWidestYCut(boxes);
  if (yCut.found && yCut.gap >= Math.max(1.0, medianHeight * 0.12)) {
    const topBoxes = boxes.filter((b) => b.midY >= yCut.cutY);
    const bottomBoxes = boxes.filter((b) => b.midY < yCut.cutY);
    if (topBoxes.length > 0 && bottomBoxes.length > 0) {
      return [
        ...partitionWithXyCut(topBoxes, medianHeight, columnStart),
        ...partitionWithXyCut(bottomBoxes, medianHeight, columnStart),
      ];
    }
  }

  const leafBoxes = [...boxes].sort((a, b) => {
    const band = Math.max(2.0, medianHeight * 0.5);
    const yDiff = Math.round(b.midY / band) - Math.round(a.midY / band);
    return yDiff !== 0 ? yDiff : a.left - b.left;
  });
  return [{ boxes: leafBoxes, columnIndex: columnStart }];
}

function groupIntoLines(
  boxes: TextRunBox[],
  columnIndex: number,
  medianHeight: number
): VisualLine[] {
  if (boxes.length === 0) return [];
  const lineTolerance = Math.max(2.5, medianHeight * 0.55);
  const ySorted = [...boxes].sort((a, b) => b.midY - a.midY || a.left - b.left);

  const groups: TextRunBox[][] = [];
  let current: TextRunBox[] = [ySorted[0]];
  let anchorMidY = ySorted[0].midY;

  for (let i = 1; i < ySorted.length; i++) {
    const b = ySorted[i];
    if (Math.abs(b.midY - anchorMidY) <= lineTolerance) {
      current.push(b);
      anchorMidY = current.reduce((sum, x) => sum + x.midY, 0) / current.length;
    } else {
      groups.push(current);
      current = [b];
      anchorMidY = b.midY;
    }
  }
  groups.push(current);

  return groups.map((group) => {
    const ordered = [...group].sort((a, b) => a.left - b.left);
    const text = ordered.map((x) => x.text).join(' ').replace(/\s+/g, ' ').trim();
    return {
      columnIndex,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      left: Math.min(...ordered.map((x) => x.left)),
      right: Math.max(...ordered.map((x) => x.right)),
      bottom: Math.min(...ordered.map((x) => x.bottom)),
      top: Math.max(...ordered.map((x) => x.top)),
      medianHeight: computeMedian(ordered.map((x) => x.height)),
    };
  });
}

function endsWithSentencePunctuation(text: string): boolean {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  const last = trimmed[trimmed.length - 1];
  return last === '.' || last === '!' || last === '?' || last === ':';
}

function isLikelyHeading(line: VisualLine, medianHeight: number): boolean {
  return (
    line.wordCount <= 12 &&
    !endsWithSentencePunctuation(line.text) &&
    line.medianHeight >= medianHeight * 1.15
  );
}

export async function extractPdfWithNodeParser(
  buffer: Buffer,
  documentId: string
): Promise<{ totalPages: number; chunks: DocumentChunkDto[] }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });

  const pdf = await loadingTask.promise;
  const totalPages = Math.max(1, pdf.numPages || 1);
  const chunks: DocumentChunkDto[] = [];

  let globalChunkIndex = 0;
  let globalCharCursor = 0;

  const finalizeChunk = (
    lines: VisualLine[],
    pageNumber: number,
    pageW: number,
    pageH: number,
    medianHeight: number
  ): DocumentChunkDto => {
    const chunkCharStart = globalCharCursor;
    const lineBboxes: LineBoundingBox[] = [];
    const textParts: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i > 0) globalCharCursor += 1;

      const lineStart = globalCharCursor;
      const lineEnd = lineStart + line.text.length;
      globalCharCursor = lineEnd;

      lineBboxes.push({
        x: Number(clamp(line.left / pageW, 0, 1).toFixed(4)),
        y: Number(clamp((pageH - line.top) / pageH, 0, 1).toFixed(4)),
        w: Number(clamp((line.right - line.left) / pageW, 0.005, 1).toFixed(4)),
        h: Number(clamp((line.top - line.bottom) / pageH, 0.005, 1).toFixed(4)),
        charStart: lineStart,
        charEnd: lineEnd,
      });

      textParts.push(line.text);
    }

    const chunkCharEnd = globalCharCursor;
    globalCharCursor += 1;

    const content = textParts.join(' ');
    const minPdfX = Math.min(...lines.map((l) => l.left));
    const maxPdfX = Math.max(...lines.map((l) => l.right));
    const minPdfY = Math.min(...lines.map((l) => l.bottom));
    const maxPdfY = Math.max(...lines.map((l) => l.top));

    const order = globalChunkIndex++;
    const blockType =
      lines.length === 1 && isLikelyHeading(lines[0], medianHeight) ? 'heading' : 'paragraph';

    return {
      id: crypto.randomUUID(),
      documentId,
      chunkIndex: order,
      readingOrder: order,
      columnIndex: lines[0].columnIndex,
      charStartIndex: chunkCharStart,
      charEndIndex: chunkCharEnd,
      blockType,
      pageNumber,
      content,
      bbox: {
        x: Number(clamp(minPdfX / pageW, 0, 1).toFixed(4)),
        y: Number(clamp((pageH - maxPdfY) / pageH, 0, 1).toFixed(4)),
        w: Number(clamp((maxPdfX - minPdfX) / pageW, 0.01, 1).toFixed(4)),
        h: Number(clamp((maxPdfY - minPdfY) / pageH, 0.01, 1).toFixed(4)),
      },
      lineBboxes,
      tokenCount: Math.ceil(content.length / 4),
    };
  };

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageW = viewport.width > 0 ? viewport.width : 595.28;
    const pageH = viewport.height > 0 ? viewport.height : 841.89;

    const textContent = await page.getTextContent();
    const runBoxes: TextRunBox[] = [];

    for (const rawItem of textContent.items as Array<Record<string, unknown>>) {
      const str = typeof rawItem.str === 'string' ? rawItem.str.trim() : '';
      if (!str) continue;

      const transform = Array.isArray(rawItem.transform)
        ? (rawItem.transform as number[])
        : [1, 0, 0, 11, 0, 0];
      const rawH =
        typeof rawItem.height === 'number' && rawItem.height > 0
          ? rawItem.height
          : Math.max(1.0, Math.abs(transform[3] || 11));
      const rawW =
        typeof rawItem.width === 'number' && rawItem.width > 0
          ? rawItem.width
          : str.length * rawH * 0.5;

      const left = clamp(transform[4] ?? 0, 0, pageW);
      const right = clamp(left + rawW, left + 1, pageW);
      const bottom = clamp(transform[5] ?? 0, 0, pageH);
      const top = clamp(bottom + rawH, bottom + 1, pageH);

      runBoxes.push({
        text: str,
        left,
        right,
        bottom,
        top,
        midY: (bottom + top) / 2,
        height: rawH,
      });
    }

    if (runBoxes.length === 0) continue;

    const medianHeight = computeMedian(runBoxes.map((b) => b.height));
    const orderedSegments = partitionWithXyCut(runBoxes, medianHeight, 0);

    const orderedLines: VisualLine[] = [];
    for (const seg of orderedSegments) {
      orderedLines.push(...groupIntoLines(seg.boxes, seg.columnIndex, medianHeight));
    }

    const targetMinWords = 45;
    const targetMaxWords = 130;
    let bucket: VisualLine[] = [];
    let bucketWords = 0;

    for (const line of orderedLines) {
      if (bucket.length > 0) {
        const prevLine = bucket[bucket.length - 1];
        const columnChanged = line.columnIndex !== prevLine.columnIndex;
        const verticalGap = prevLine.bottom - line.top;
        const paragraphBreak = verticalGap > medianHeight * 0.75;
        const prevEndedSentence = endsWithSentencePunctuation(prevLine.text);

        const shouldFlush =
          columnChanged ||
          bucketWords >= targetMaxWords ||
          (bucketWords >= targetMinWords && (paragraphBreak || prevEndedSentence)) ||
          (bucket.length === 1 && isLikelyHeading(prevLine, medianHeight));

        if (shouldFlush) {
          chunks.push(finalizeChunk(bucket, pageNum, pageW, pageH, medianHeight));
          bucket = [];
          bucketWords = 0;
        }
      }

      bucket.push(line);
      bucketWords += line.wordCount;
    }

    if (bucket.length > 0) {
      chunks.push(finalizeChunk(bucket, pageNum, pageW, pageH, medianHeight));
    }
  }

  return { totalPages, chunks };
}

export function extractPlainTextChunks(
  textContent: string,
  documentId: string
): DocumentChunkDto[] {
  const normalized = textContent.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const chunks: DocumentChunkDto[] = [];
  let charCursor = 0;
  let yCursor = 0.06;

  paragraphs.forEach((para, idx) => {
    const clean = para.replace(/\s+/g, ' ').trim().slice(0, 1200);
    const start = charCursor;
    const end = start + clean.length;
    charCursor = end + 1;

    const h = Math.min(0.18, Math.max(0.04, Math.ceil(clean.length / 90) * 0.024));
    const y = clamp(yCursor, 0.05, 0.85);
    yCursor = y + h + 0.025 > 0.92 ? 0.06 : y + h + 0.025;
    const pageNumber = Math.floor(idx / 6) + 1;

    chunks.push({
      id: crypto.randomUUID(),
      documentId,
      chunkIndex: idx,
      readingOrder: idx,
      columnIndex: 0,
      charStartIndex: start,
      charEndIndex: end,
      blockType: clean.length < 70 && !endsWithSentencePunctuation(clean) ? 'heading' : 'paragraph',
      pageNumber,
      content: clean,
      bbox: {
        x: 0.07,
        y: Number(y.toFixed(4)),
        w: 0.86,
        h: Number(h.toFixed(4)),
      },
      lineBboxes: [{ x: 0.07, y: Number(y.toFixed(4)), w: 0.86, h: Number(h.toFixed(4)), charStart: start, charEnd: end }],
      tokenCount: Math.ceil(clean.length / 4),
    });
  });

  return chunks;
}
