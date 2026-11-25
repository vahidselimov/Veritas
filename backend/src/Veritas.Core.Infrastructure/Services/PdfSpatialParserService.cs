using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using Veritas.Core.Domain.Entities;
using Veritas.Core.Domain.Interfaces;

namespace Veritas.Core.Infrastructure.Services
{
    /// <summary>
    /// Deterministic PDF spatial parser implementing Recursive XY-Cut column ordering,
    /// character offset mapping, and sub-pixel normalized bounding box extraction.
    /// </summary>
    public class PdfSpatialParserService : IPdfCoordinateExtractor
    {
        private sealed record WordBox(
            string Text,
            double Left,
            double Right,
            double Bottom,
            double Top,
            double Height
        )
        {
            public double MidY => (Bottom + Top) / 2.0;
        }

        private sealed record LayoutSegment(List<WordBox> Words, int ColumnIndex);

        private sealed class VisualLine
        {
            public int ColumnIndex { get; init; }
            public List<WordBox> Words { get; init; } = new();
            public string Text { get; init; } = string.Empty;
            public double Left { get; init; }
            public double Right { get; init; }
            public double Bottom { get; init; }
            public double Top { get; init; }
            public double MedianHeight { get; init; }
        }

        public Task<List<DocumentChunk>> ExtractChunksWithBBoxAsync(
            string filePath,
            Guid documentId,
            CancellationToken cancellationToken = default)
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"PDF file not found at: {filePath}");
            }

            var chunks = new List<DocumentChunk>();
            int globalChunkIndex = 0;
            int globalCharCursor = 0;

            using var document = PdfDocument.Open(filePath);

            foreach (var page in document.GetPages())
            {
                cancellationToken.ThrowIfCancellationRequested();

                var pageW = page.Width > 0 ? page.Width : 595.28; // A4 fallback in points
                var pageH = page.Height > 0 ? page.Height : 841.89;

                var wordBoxes = page.GetWords()
                    .Where(w => !string.IsNullOrWhiteSpace(w.Text))
                    .Select(w => new WordBox(
                        w.Text.Trim(),
                        Clamp(w.BoundingBox.Left, 0, pageW),
                        Clamp(w.BoundingBox.Right, 0, pageW),
                        Clamp(w.BoundingBox.Bottom, 0, pageH),
                        Clamp(w.BoundingBox.Top, 0, pageH),
                        Math.Max(1.0, w.BoundingBox.Height)
                    ))
                    .Where(w => w.Right >= w.Left && w.Top >= w.Bottom)
                    .ToList();

                if (wordBoxes.Count == 0)
                {
                    continue;
                }

                double medianHeight = ComputeMedian(wordBoxes.Select(w => w.Height));

                // 1. Recursive XY-Cut partitions multi-column pages without interleaving columns
                var orderedSegments = PartitionWithXyCut(wordBoxes, medianHeight, columnStart: 0);

                // 2. Group ordered words inside each column segment into visual text lines
                var orderedLines = new List<VisualLine>();
                foreach (var segment in orderedSegments)
                {
                    orderedLines.AddRange(GroupWordsIntoLines(segment.Words, segment.ColumnIndex, medianHeight));
                }

                // 3. Semantic chunking honoring column boundaries, vertical gaps, and sentence ends
                var pageChunks = BuildSemanticChunks(
                    orderedLines,
                    documentId,
                    page.Number,
                    pageW,
                    pageH,
                    medianHeight,
                    ref globalChunkIndex,
                    ref globalCharCursor
                );

                chunks.AddRange(pageChunks);
            }

            return Task.FromResult(chunks);
        }

        private static List<LayoutSegment> PartitionWithXyCut(
            List<WordBox> words,
            double medianHeight,
            int columnStart)
        {
            if (words.Count == 0)
            {
                return new List<LayoutSegment>();
            }

            if (words.Count <= 2)
            {
                var sortedLeaf = words
                    .OrderByDescending(w => Math.Round(w.MidY / Math.Max(2.0, medianHeight * 0.5)))
                    .ThenBy(w => w.Left)
                    .ToList();
                return new List<LayoutSegment> { new(sortedLeaf, columnStart) };
            }

            double minY = words.Min(w => w.Bottom);
            double maxY = words.Max(w => w.Top);
            double regionHeight = maxY - minY;

            // Find strongest vertical column gutter (X-projection, left-to-right)
            // Guard: only treat an X-gap as a column gutter if region spans > ~2.1 lines
            double gutterThreshold = Math.Max(14.0, medianHeight * 1.35);
            var (hasXCut, xCutPos, _) = regionHeight > medianHeight * 2.1 && words.Count >= 4
                ? FindWidestColumnGutter(words, gutterThreshold, medianHeight)
                : (false, 0.0, 0.0);

            // Priority 1: Multi-column vertical gutter split (when no element crosses the gutter,
            // finish entire left column top-to-bottom before entering right column)
            if (hasXCut)
            {
                var leftWords = words.Where(w => (w.Left + w.Right) / 2.0 <= xCutPos).ToList();
                var rightWords = words.Where(w => (w.Left + w.Right) / 2.0 > xCutPos).ToList();
                if (leftWords.Count > 0 && rightWords.Count > 0)
                {
                    var leftSegments = PartitionWithXyCut(leftWords, medianHeight, columnStart);
                    int nextCol = leftSegments.Count > 0
                        ? leftSegments.Max(s => s.ColumnIndex) + 1
                        : columnStart + 1;
                    var rightSegments = PartitionWithXyCut(rightWords, medianHeight, nextCol);

                    leftSegments.AddRange(rightSegments);
                    return leftSegments;
                }
            }

            // Find strongest horizontal whitespace cut (Y-projection, top-to-bottom)
            var (hasYCut, yCutPos, yGap) = FindWidestYCut(words);

            // Priority 2: Horizontal section/paragraph/line cut (peels off full-width headers/titles first)
            if (hasYCut && yGap >= Math.Max(1.0, medianHeight * 0.12))
            {
                var topWords = words.Where(w => w.MidY >= yCutPos).ToList();
                var bottomWords = words.Where(w => w.MidY < yCutPos).ToList();
                if (topWords.Count > 0 && bottomWords.Count > 0)
                {
                    var result = new List<LayoutSegment>();
                    result.AddRange(PartitionWithXyCut(topWords, medianHeight, columnStart));
                    result.AddRange(PartitionWithXyCut(bottomWords, medianHeight, columnStart));
                    return result;
                }
            }

            // Leaf region: single line or tight cluster — order left-to-right
            var leafWords = words
                .OrderByDescending(w => Math.Round(w.MidY / Math.Max(2.0, medianHeight * 0.5)))
                .ThenBy(w => w.Left)
                .ToList();
            return new List<LayoutSegment> { new(leafWords, columnStart) };
        }

        private static (bool Found, double CutY, double Gap) FindWidestYCut(List<WordBox> words)
        {
            var sorted = words.OrderByDescending(w => w.Top).ToList();
            double coveredBottom = sorted[0].Bottom;
            double bestGap = 0;
            double bestCutY = 0;

            for (int i = 1; i < sorted.Count; i++)
            {
                var w = sorted[i];
                if (w.Top < coveredBottom)
                {
                    double gap = coveredBottom - w.Top;
                    if (gap > bestGap)
                    {
                        bestGap = gap;
                        bestCutY = w.Top + gap / 2.0;
                    }
                    coveredBottom = w.Bottom;
                }
                else if (w.Bottom < coveredBottom)
                {
                    coveredBottom = w.Bottom;
                }
            }

            return (bestGap > 0.5, bestCutY, bestGap);
        }

        private static (bool Found, double CutX, double Gap) FindWidestColumnGutter(
            List<WordBox> words,
            double minGutterWidth,
            double medianHeight)
        {
            var sorted = words.OrderBy(w => w.Left).ToList();
            double coveredRight = sorted[0].Right;
            double bestGap = 0;
            double bestCutX = 0;

            for (int i = 1; i < sorted.Count; i++)
            {
                var w = sorted[i];
                if (w.Left > coveredRight)
                {
                    double gap = w.Left - coveredRight;
                    if (gap >= minGutterWidth && gap > bestGap)
                    {
                        double candidateCutX = coveredRight + gap / 2.0;
                        if (HasMultiLineContentOnBothSides(words, candidateCutX, medianHeight))
                        {
                            bestGap = gap;
                            bestCutX = candidateCutX;
                        }
                    }
                    coveredRight = w.Right;
                }
                else if (w.Right > coveredRight)
                {
                    coveredRight = w.Right;
                }
            }

            return (bestGap >= minGutterWidth, bestCutX, bestGap);
        }

        private static bool HasMultiLineContentOnBothSides(
            List<WordBox> words,
            double cutX,
            double medianHeight)
        {
            var left = words.Where(w => (w.Left + w.Right) / 2.0 <= cutX).ToList();
            var right = words.Where(w => (w.Left + w.Right) / 2.0 > cutX).ToList();

            if (left.Count < 2 || right.Count < 2)
            {
                return false;
            }

            double leftSpanY = left.Max(w => w.Top) - left.Min(w => w.Bottom);
            double rightSpanY = right.Max(w => w.Top) - right.Min(w => w.Bottom);
            double leftSpanX = left.Max(w => w.Right) - left.Min(w => w.Left);
            double rightSpanX = right.Max(w => w.Right) - right.Min(w => w.Left);

            // Prevent hanging page numbers, short indents, or narrow table cells from splitting as prose columns
            return leftSpanY > medianHeight * 1.4 &&
                   rightSpanY > medianHeight * 1.4 &&
                   leftSpanX >= 105.0 &&
                   rightSpanX >= 105.0;
        }

        private static List<VisualLine> GroupWordsIntoLines(
            List<WordBox> words,
            int columnIndex,
            double medianHeight)
        {
            if (words.Count == 0)
            {
                return new List<VisualLine>();
            }

            double lineTolerance = Math.Max(2.5, medianHeight * 0.55);
            var ySorted = words.OrderByDescending(w => w.MidY).ThenBy(w => w.Left).ToList();

            var rawGroups = new List<List<WordBox>>();
            var currentLine = new List<WordBox> { ySorted[0] };
            double anchorMidY = ySorted[0].MidY;

            for (int i = 1; i < ySorted.Count; i++)
            {
                var w = ySorted[i];
                if (Math.Abs(w.MidY - anchorMidY) <= lineTolerance)
                {
                    currentLine.Add(w);
                    anchorMidY = currentLine.Average(x => x.MidY);
                }
                else
                {
                    rawGroups.Add(currentLine);
                    currentLine = new List<WordBox> { w };
                    anchorMidY = w.MidY;
                }
            }
            rawGroups.Add(currentLine);

            return rawGroups
                .Select(group =>
                {
                    var ordered = group.OrderBy(w => w.Left).ToList();
                    return new VisualLine
                    {
                        ColumnIndex = columnIndex,
                        Words = ordered,
                        Text = string.Join(" ", ordered.Select(w => w.Text)),
                        Left = ordered.Min(w => w.Left),
                        Right = ordered.Max(w => w.Right),
                        Bottom = ordered.Min(w => w.Bottom),
                        Top = ordered.Max(w => w.Top),
                        MedianHeight = ComputeMedian(ordered.Select(w => w.Height))
                    };
                })
                .ToList();
        }

        private static List<DocumentChunk> BuildSemanticChunks(
            List<VisualLine> lines,
            Guid documentId,
            int pageNumber,
            double pageW,
            double pageH,
            double medianHeight,
            ref int globalChunkIndex,
            ref int globalCharCursor)
        {
            var chunks = new List<DocumentChunk>();
            if (lines.Count == 0)
            {
                return chunks;
            }

            const int targetMinWords = 45;
            const int targetMaxWords = 130;

            var bucket = new List<VisualLine>();
            int bucketWords = 0;

            for (int i = 0; i < lines.Count; i++)
            {
                var line = lines[i];

                if (bucket.Count > 0)
                {
                    var prevLine = bucket[^1];
                    bool columnChanged = line.ColumnIndex != prevLine.ColumnIndex;
                    double verticalGap = prevLine.Bottom - line.Top;
                    bool paragraphBreak = verticalGap > medianHeight * 0.75;
                    bool prevEndedSentence = EndsWithSentencePunctuation(prevLine.Text);

                    bool shouldFlush =
                        columnChanged ||
                        bucketWords >= targetMaxWords ||
                        (bucketWords >= targetMinWords && (paragraphBreak || prevEndedSentence)) ||
                        (bucket.Count == 1 && IsLikelyHeading(prevLine, verticalGap, medianHeight));

                    if (shouldFlush)
                    {
                        chunks.Add(FinalizeChunk(
                            bucket,
                            documentId,
                            pageNumber,
                            pageW,
                            pageH,
                            medianHeight,
                            ref globalChunkIndex,
                            ref globalCharCursor
                        ));
                        bucket.Clear();
                        bucketWords = 0;
                    }
                }

                bucket.Add(line);
                bucketWords += line.Words.Count;
            }

            if (bucket.Count > 0)
            {
                chunks.Add(FinalizeChunk(
                    bucket,
                    documentId,
                    pageNumber,
                    pageW,
                    pageH,
                    medianHeight,
                    ref globalChunkIndex,
                    ref globalCharCursor
                ));
            }

            return chunks;
        }

        private static DocumentChunk FinalizeChunk(
            List<VisualLine> lines,
            Guid documentId,
            int pageNumber,
            double pageW,
            double pageH,
            double medianHeight,
            ref int globalChunkIndex,
            ref int globalCharCursor)
        {
            int chunkCharStart = globalCharCursor;
            var lineBboxes = new List<LineBoundingBox>(lines.Count);
            var textParts = new List<string>(lines.Count);

            for (int i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                if (i > 0)
                {
                    globalCharCursor += 1; // space separator
                }

                int lineStart = globalCharCursor;
                int lineEnd = lineStart + line.Text.Length;
                globalCharCursor = lineEnd;

                lineBboxes.Add(new LineBoundingBox(
                    Math.Round(Clamp(line.Left / pageW, 0.0, 1.0), 4),
                    Math.Round(Clamp((pageH - line.Top) / pageH, 0.0, 1.0), 4),
                    Math.Round(Clamp((line.Right - line.Left) / pageW, 0.005, 1.0), 4),
                    Math.Round(Clamp((line.Top - line.Bottom) / pageH, 0.005, 1.0), 4),
                    lineStart,
                    lineEnd
                ));

                textParts.Add(line.Text);
            }

            int chunkCharEnd = globalCharCursor;
            globalCharCursor += 1; // inter-chunk space separator

            string content = string.Join(" ", textParts);
            double minPdfX = lines.Min(l => l.Left);
            double maxPdfX = lines.Max(l => l.Right);
            double minPdfY = lines.Min(l => l.Bottom);
            double maxPdfY = lines.Max(l => l.Top);

            var chunkBbox = new BoundingBox(
                Math.Round(Clamp(minPdfX / pageW, 0.0, 1.0), 4),
                Math.Round(Clamp((pageH - maxPdfY) / pageH, 0.0, 1.0), 4),
                Math.Round(Clamp((maxPdfX - minPdfX) / pageW, 0.01, 1.0), 4),
                Math.Round(Clamp((maxPdfY - minPdfY) / pageH, 0.01, 1.0), 4)
            );

            string blockType = lines.Count == 1 && IsLikelyHeading(lines[0], medianHeight, medianHeight)
                ? "heading"
                : "paragraph";

            int order = globalChunkIndex++;

            return new DocumentChunk
            {
                Id = Guid.NewGuid(),
                DocumentId = documentId,
                ChunkIndex = order,
                ReadingOrder = order,
                ColumnIndex = lines[0].ColumnIndex,
                CharStartIndex = chunkCharStart,
                CharEndIndex = chunkCharEnd,
                BlockType = blockType,
                PageNumber = pageNumber,
                Content = content,
                TokenCount = (int)Math.Ceiling(content.Length / 4.0),
                Bbox = chunkBbox,
                LineBboxes = lineBboxes,
                CreatedAt = DateTime.UtcNow
            };
        }

        private static bool EndsWithSentencePunctuation(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            char last = text.TrimEnd()[^1];
            return last == '.' || last == '!' || last == '?' || last == ':';
        }

        private static bool IsLikelyHeading(VisualLine line, double verticalGap, double medianHeight)
        {
            return line.Words.Count <= 12 &&
                   !EndsWithSentencePunctuation(line.Text) &&
                   line.MedianHeight >= medianHeight * 1.15;
        }

        private static double ComputeMedian(IEnumerable<double> values)
        {
            var sorted = values.OrderBy(v => v).ToList();
            if (sorted.Count == 0) return 11.0;
            int mid = sorted.Count / 2;
            return sorted.Count % 2 == 0
                ? (sorted[mid - 1] + sorted[mid]) / 2.0
                : sorted[mid];
        }

        private static double Clamp(double val, double min, double max) =>
            Math.Max(min, Math.Min(max, val));
    }
}
