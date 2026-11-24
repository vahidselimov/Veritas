using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using UglyToad.PdfPig;
using Veritas.Core.Domain.Entities;
using Veritas.Core.Domain.Interfaces;

namespace Veritas.Core.Infrastructure.Services
{
    public class PdfSpatialParserService : IPdfCoordinateExtractor
    {
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

            using var document = PdfDocument.Open(filePath);

            foreach (var page in document.GetPages())
            {
                cancellationToken.ThrowIfCancellationRequested();

                var pageW = page.Width;
                var pageH = page.Height;
                if (pageW <= 0) pageW = 595.28; // Standard A4 points fallback
                if (pageH <= 0) pageH = 841.89;

                // Extract words on this page
                var words = page.GetWords().ToList();
                if (words.Count == 0)
                {
                    continue;
                }

                // Chunk words into semantic blocks (~100-150 words per chunk)
                const int wordsPerChunk = 120;
                for (int i = 0; i < words.Count; i += wordsPerChunk)
                {
                    var chunkWords = words.Skip(i).Take(wordsPerChunk).ToList();
                    if (chunkWords.Count == 0) continue;

                    var content = string.Join(" ", chunkWords.Select(w => w.Text));

                    // Spatial Bounding Box Normalization:
                    // PDF: (0,0) is bottom-left
                    // DOM Canvas: (0,0) is top-left
                    // Normalized to 0.0 - 1.0 relative to page width and height
                    var minPdfX = chunkWords.Min(w => w.BoundingBox.Left);
                    var maxPdfX = chunkWords.Max(w => w.BoundingBox.Right);
                    var minPdfY = chunkWords.Min(w => w.BoundingBox.Bottom);
                    var maxPdfY = chunkWords.Max(w => w.BoundingBox.Top);

                    var normX = Math.Max(0.0, Math.Min(1.0, minPdfX / pageW));
                    var normY = Math.Max(0.0, Math.Min(1.0, (pageH - maxPdfY) / pageH));
                    var normW = Math.Max(0.01, Math.Min(1.0, (maxPdfX - minPdfX) / pageW));
                    var normH = Math.Max(0.01, Math.Min(1.0, (maxPdfY - minPdfY) / pageH));

                    var chunk = new DocumentChunk
                    {
                        Id = Guid.NewGuid(),
                        DocumentId = documentId,
                        ChunkIndex = globalChunkIndex++,
                        PageNumber = page.Number,
                        Content = content,
                        TokenCount = (int)Math.Ceiling(content.Length / 4.0),
                        Bbox = new BoundingBox(
                            Math.Round(normX, 4),
                            Math.Round(normY, 4),
                            Math.Round(normW, 4),
                            Math.Round(normH, 4)
                        ),
                        CreatedAt = DateTime.UtcNow
                    };

                    chunks.Add(chunk);
                }
            }

            return Task.FromResult(chunks);
        }
    }
}
