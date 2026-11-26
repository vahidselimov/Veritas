using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UglyToad.PdfPig;
using Veritas.Core.Domain.Entities;
using Veritas.Core.Domain.Interfaces;
using Veritas.Core.Infrastructure.Data;

namespace Veritas.Core.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private const int MaxBatchFiles = 25;
        private const int MinTextCharsBeforeOcrFallback = 50;

        private readonly VeritasDbContext _context;
        private readonly IPdfCoordinateExtractor _coordinateExtractor;
        private readonly ICoordinateCacheService _coordinateCache;
        private readonly IIngestionValidationService _validator;
        private readonly IWebHostEnvironment _env;

        public DocumentsController(
            VeritasDbContext context,
            IPdfCoordinateExtractor coordinateExtractor,
            ICoordinateCacheService coordinateCache,
            IIngestionValidationService validator,
            IWebHostEnvironment env)
        {
            _context = context;
            _coordinateExtractor = coordinateExtractor;
            _coordinateCache = coordinateCache;
            _validator = validator;
            _env = env;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Document>>> GetDocuments()
        {
            return await _context.Documents.OrderByDescending(d => d.CreatedAt).ToListAsync();
        }

        [HttpGet("summary")]
        public async Task<ActionResult<IEnumerable<object>>> GetDocumentSummaries()
        {
            var docs = await _context.Documents
                .AsNoTracking()
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            var chunkStats = await _context.DocumentChunks
                .AsNoTracking()
                .GroupBy(c => c.DocumentId)
                .Select(g => new
                {
                    DocumentId = g.Key,
                    ChunkCount = g.Count(),
                    MaxColumn = g.Max(c => c.ColumnIndex),
                    TotalChars = g.Max(c => c.CharEndIndex)
                })
                .ToDictionaryAsync(x => x.DocumentId);

            var summaries = docs.Select(d =>
            {
                chunkStats.TryGetValue(d.Id, out var stat);
                return new
                {
                    d.Id,
                    d.Name,
                    d.FilePath,
                    d.MimeType,
                    d.FileSizeBytes,
                    d.TotalPages,
                    d.Checksum,
                    d.Status,
                    ChunkCount = stat?.ChunkCount ?? 0,
                    ColumnCount = stat != null ? stat.MaxColumn + 1 : 1,
                    TotalCharacters = stat?.TotalChars ?? 0,
                    d.CreatedAt
                };
            });

            return Ok(summaries);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Document>> GetDocument(Guid id)
        {
            var doc = await _context.Documents.FindAsync(id);
            if (doc == null) return NotFound();
            return doc;
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(Guid id)
        {
            var doc = await _context.Documents.FindAsync(id);
            if (doc == null) return NotFound();

            var resolvedPath = Path.IsPathRooted(doc.FilePath)
                ? doc.FilePath
                : Path.Combine(_env.ContentRootPath, doc.FilePath.Replace("/", Path.DirectorySeparatorChar.ToString()));

            _context.Documents.Remove(doc);
            await _context.SaveChangesAsync();
            _coordinateCache.InvalidateDocumentCache(id);

            if (System.IO.File.Exists(resolvedPath))
            {
                System.IO.File.Delete(resolvedPath);
            }

            return Ok(new { deleted = true, id });
        }

        [HttpGet("{id}/chunks")]
        public async Task<ActionResult<IEnumerable<DocumentChunk>>> GetDocumentChunks(Guid id, [FromQuery] int? pageNumber)
        {
            var cached = await _coordinateCache.GetOrLoadChunksAsync(id, pageNumber, HttpContext.RequestAborted);
            Response.Headers["X-Coordinate-Cache"] = cached.CacheHit ? "HIT" : "MISS";
            Response.Headers["X-Coordinate-Lookup-Ms"] = cached.LookupMs.ToString("F3", CultureInfo.InvariantCulture);
            Response.Headers["Cache-Control"] = "private, max-age=60";
            return Ok(cached.Chunks);
        }

        [HttpGet("{id}/coordinates")]
        public async Task<ActionResult<CoordinateCacheResult>> GetDocumentCoordinates(Guid id, [FromQuery] int? pageNumber)
        {
            var cached = await _coordinateCache.GetOrLoadChunksAsync(id, pageNumber, HttpContext.RequestAborted);
            Response.Headers["X-Coordinate-Cache"] = cached.CacheHit ? "HIT" : "MISS";
            Response.Headers["X-Coordinate-Lookup-Ms"] = cached.LookupMs.ToString("F3", CultureInfo.InvariantCulture);
            Response.Headers["Cache-Control"] = "private, max-age=60";
            return Ok(cached);
        }

        [HttpPost("{id}/reparse")]
        public async Task<ActionResult<CoordinateCacheResult>> ReparseDocument(Guid id)
        {
            var doc = await _context.Documents.FindAsync(id);
            if (doc == null) return NotFound();

            var resolvedPath = Path.IsPathRooted(doc.FilePath)
                ? doc.FilePath
                : Path.Combine(_env.ContentRootPath, doc.FilePath.Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (!System.IO.File.Exists(resolvedPath))
            {
                return NotFound(new { error = $"Source file not found on disk: {doc.FilePath}" });
            }

            if (!doc.Name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { error = "Reparse is currently supported only for PDF documents." });
            }

            var existingChunks = await _context.DocumentChunks.Where(c => c.DocumentId == id).ToListAsync();
            if (existingChunks.Count > 0)
            {
                _context.DocumentChunks.RemoveRange(existingChunks);
            }

            var newChunks = await _coordinateExtractor.ExtractChunksWithBBoxAsync(resolvedPath, id, HttpContext.RequestAborted);
            if (newChunks.Count > 0)
            {
                await _context.DocumentChunks.AddRangeAsync(newChunks);
            }

            doc.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _coordinateCache.WarmDocumentCache(id, newChunks);
            var warmResult = await _coordinateCache.GetOrLoadChunksAsync(id, null, HttpContext.RequestAborted);
            return Ok(warmResult);
        }

        [HttpPost("upload")]
        [RequestSizeLimit(125_829_120)] // 120 MB limit
        public async Task<ActionResult<Document>> UploadDocument([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded or file is empty.", code = "EMPTY_FILE" });
            }

            var result = await IngestSingleFileAsync(file, new Dictionary<string, Document>(), HttpContext.RequestAborted);
            if (result.Status == "rejected" || result.Document == null)
            {
                return BadRequest(new { error = result.ErrorMessage ?? "Upload validation failed.", code = result.ErrorCode });
            }

            if (result.IsDuplicate)
            {
                Response.Headers["X-Veritas-Duplicate"] = "true";
                return Ok(result.Document);
            }

            Response.Headers["X-Veritas-Duplicate"] = "false";
            return CreatedAtAction(nameof(GetDocument), new { id = result.Document.Id }, result.Document);
        }

        [HttpPost("upload-batch")]
        [RequestSizeLimit(262_144_000)] // 250 MB batch ceiling
        public async Task<ActionResult<BatchIngestionResponse>> UploadBatch([FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(new { error = "No files provided in batch.", code = "EMPTY_BATCH" });
            }

            if (files.Count > MaxBatchFiles)
            {
                return BadRequest(new
                {
                    error = $"Batch limit is {MaxBatchFiles} files per request.",
                    code = "BATCH_LIMIT_EXCEEDED"
                });
            }

            var response = new BatchIngestionResponse
            {
                TotalFiles = files.Count
            };

            var batchSeen = new Dictionary<string, Document>(StringComparer.Ordinal);
            foreach (var file in files)
            {
                var item = await IngestSingleFileAsync(file, batchSeen, HttpContext.RequestAborted);
                response.Results.Add(item);

                switch (item.Status)
                {
                    case "indexed":
                        response.IndexedCount++;
                        break;
                    case "duplicate":
                        response.DuplicateCount++;
                        break;
                    case "ocr_required":
                        response.OcrRequiredCount++;
                        break;
                    default:
                        response.RejectedCount++;
                        break;
                }
            }

            return Ok(response);
        }

        private async Task<BatchIngestionItemResult> IngestSingleFileAsync(
            IFormFile file,
            Dictionary<string, Document> batchSeen,
            CancellationToken ct)
        {
            var safeName = Path.GetFileName(file.FileName ?? "unnamed");

            if (file.Length == 0)
            {
                return Rejected(safeName, "EMPTY_FILE", $"File '{safeName}' is empty (0 bytes).");
            }

            // Read into memory buffer (capped at 120 MB) to validate magic bytes & compute SHA-256 before disk write
            if (file.Length > 125_829_120)
            {
                return Rejected(safeName, "FILE_TOO_LARGE", $"File '{safeName}' exceeds 120 MB maximum size.");
            }

            byte[] fileBytes;
            await using (var ms = new MemoryStream((int)Math.Min(file.Length, 125_829_120)))
            {
                await file.CopyToAsync(ms, ct);
                fileBytes = ms.ToArray();
            }

            // Scan header + up to 2 MB of raw payload for magic signature & blocked active PDF triggers
            int scanSize = Math.Min(fileBytes.Length, 2 * 1024 * 1024);
            var scanSlice = scanSize == fileBytes.Length ? fileBytes : fileBytes[..scanSize];
            var validation = _validator.ValidateUpload(safeName, fileBytes.Length, scanSlice);

            if (!validation.IsValid)
            {
                return Rejected(safeName, validation.ErrorCode, validation.ErrorMessage);
            }

            string checksum = Convert.ToHexString(SHA256.HashData(fileBytes)).ToLowerInvariant();

            // Deduplicate against both current batch and persisted PostgreSQL documents
            if (batchSeen.TryGetValue(checksum, out var seenDoc))
            {
                int seenChunks = await _context.DocumentChunks.CountAsync(c => c.DocumentId == seenDoc.Id, ct);
                return new BatchIngestionItemResult
                {
                    FileName = safeName,
                    Status = "duplicate",
                    IsDuplicate = true,
                    ChunkCount = seenChunks,
                    TotalPages = seenDoc.TotalPages,
                    Document = seenDoc
                };
            }

            var existingDoc = await _context.Documents.FirstOrDefaultAsync(d => d.Checksum == checksum, ct);
            if (existingDoc != null)
            {
                batchSeen[checksum] = existingDoc;
                int existingChunks = await _context.DocumentChunks.CountAsync(c => c.DocumentId == existingDoc.Id, ct);
                return new BatchIngestionItemResult
                {
                    FileName = safeName,
                    Status = "duplicate",
                    IsDuplicate = true,
                    ChunkCount = existingChunks,
                    TotalPages = existingDoc.TotalPages,
                    Document = existingDoc
                };
            }

            var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads");
            if (!Directory.Exists(uploadsDir))
            {
                Directory.CreateDirectory(uploadsDir);
            }

            var docId = Guid.NewGuid();
            var storedFileName = $"{docId}_{safeName}";
            var filePath = Path.Combine(uploadsDir, storedFileName);
            await System.IO.File.WriteAllBytesAsync(filePath, fileBytes, ct);

            int totalPages = 1;
            var extractedChunks = new List<DocumentChunk>();
            string docStatus = "indexed";

            if (validation.Extension == ".pdf")
            {
                try
                {
                    using (var pdf = PdfDocument.Open(filePath))
                    {
                        totalPages = Math.Max(1, pdf.NumberOfPages);
                    }

                    extractedChunks = await _coordinateExtractor.ExtractChunksWithBBoxAsync(filePath, docId, ct);
                    foreach (var chunk in extractedChunks)
                    {
                        chunk.Content = _validator.SanitizeExtractedText(chunk.Content);
                    }

                    int extractedCharTotal = extractedChunks.Sum(c => c.Content.Length);
                    if (extractedCharTotal < MinTextCharsBeforeOcrFallback)
                    {
                        docStatus = "ocr_required";
                        if (extractedChunks.Count == 0)
                        {
                            var ocrNotice = $"[OCR_REQUIRED] {safeName} appears to be a scanned/image PDF ({extractedCharTotal} extractable chars across {totalPages} pages). Queued for OCR fallback.";
                            extractedChunks.Add(new DocumentChunk
                            {
                                Id = Guid.NewGuid(),
                                DocumentId = docId,
                                ChunkIndex = 0,
                                ReadingOrder = 0,
                                ColumnIndex = 0,
                                CharStartIndex = 0,
                                CharEndIndex = ocrNotice.Length,
                                BlockType = "ocr_needed",
                                PageNumber = 1,
                                Content = ocrNotice,
                                TokenCount = (int)Math.Ceiling(ocrNotice.Length / 4.0),
                                Bbox = new BoundingBox(0.05, 0.08, 0.9, 0.12),
                                LineBboxes = new List<LineBoundingBox>
                                {
                                    new LineBoundingBox(0.05, 0.08, 0.9, 0.12, 0, ocrNotice.Length)
                                },
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
                    return Rejected(safeName, "CORRUPT_PDF", $"Failed to parse PDF '{safeName}': {ex.Message}");
                }
            }
            else
            {
                var rawText = _validator.SanitizeExtractedText(Encoding.UTF8.GetString(fileBytes));
                extractedChunks = ChunkPlainText(rawText, docId);
                totalPages = extractedChunks.Count > 0 ? extractedChunks.Max(c => c.PageNumber) : 1;
            }

            var doc = new Document
            {
                Id = docId,
                Name = safeName,
                FilePath = Path.Combine("uploads", storedFileName).Replace("\\", "/"),
                MimeType = file.ContentType ?? (validation.Extension == ".pdf" ? "application/pdf" : "text/plain"),
                FileSizeBytes = fileBytes.Length,
                TotalPages = totalPages,
                Checksum = checksum,
                Status = docStatus,
                MetadataJson = JsonSerializer.Serialize(new
                {
                    originalFileName = safeName,
                    uploadedAt = DateTime.UtcNow.ToString("O"),
                    parser = validation.Extension == ".pdf" ? "PdfPig-XYCut-v1" : "TextStream",
                    hasOpenAction = validation.HasOpenAction,
                    chunkCount = extractedChunks.Count,
                    totalCharacters = extractedChunks.Count > 0 ? extractedChunks.Max(c => c.CharEndIndex) : 0
                }),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Documents.AddAsync(doc, ct);
            if (extractedChunks.Count > 0)
            {
                await _context.DocumentChunks.AddRangeAsync(extractedChunks, ct);
            }

            await _context.SaveChangesAsync(ct);

            if (extractedChunks.Count > 0)
            {
                _coordinateCache.WarmDocumentCache(doc.Id, extractedChunks);
            }

            batchSeen[checksum] = doc;

            return new BatchIngestionItemResult
            {
                FileName = safeName,
                Status = docStatus,
                IsDuplicate = false,
                ChunkCount = extractedChunks.Count,
                TotalPages = totalPages,
                Document = doc
            };
        }

        private static List<DocumentChunk> ChunkPlainText(string rawText, Guid documentId)
        {
            var chunks = new List<DocumentChunk>();
            var paragraphs = rawText
                .Replace("\r\n", "\n")
                .Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            int cursor = 0;
            double yCursor = 0.06;

            for (int i = 0; i < paragraphs.Length; i++)
            {
                var clean = string.Join(" ", paragraphs[i].Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
                if (clean.Length > 1200) clean = clean[..1200];
                if (clean.Length == 0) continue;

                int start = cursor;
                int end = start + clean.Length;
                cursor = end + 1;

                double h = Math.Min(0.18, Math.Max(0.04, Math.Ceiling(clean.Length / 90.0) * 0.024));
                double y = Math.Clamp(yCursor, 0.05, 0.85);
                yCursor = y + h + 0.025 > 0.92 ? 0.06 : y + h + 0.025;
                int pageNumber = (chunks.Count / 6) + 1;

                var bbox = new BoundingBox(0.07, Math.Round(y, 4), 0.86, Math.Round(h, 4));
                chunks.Add(new DocumentChunk
                {
                    Id = Guid.NewGuid(),
                    DocumentId = documentId,
                    ChunkIndex = chunks.Count,
                    ReadingOrder = chunks.Count,
                    ColumnIndex = 0,
                    CharStartIndex = start,
                    CharEndIndex = end,
                    BlockType = clean.Length < 70 && !clean.EndsWith('.') ? "heading" : "paragraph",
                    PageNumber = pageNumber,
                    Content = clean,
                    TokenCount = (int)Math.Ceiling(clean.Length / 4.0),
                    Bbox = bbox,
                    LineBboxes = new List<LineBoundingBox>
                    {
                        new LineBoundingBox(bbox.X, bbox.Y, bbox.W, bbox.H, start, end)
                    },
                    CreatedAt = DateTime.UtcNow
                });
            }

            return chunks;
        }

        private static BatchIngestionItemResult Rejected(string fileName, string code, string message) =>
            new()
            {
                FileName = fileName,
                Status = "rejected",
                IsDuplicate = false,
                ErrorCode = code,
                ErrorMessage = message
            };
    }
}
