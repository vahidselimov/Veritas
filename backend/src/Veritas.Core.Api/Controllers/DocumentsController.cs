using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
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
        private readonly VeritasDbContext _context;
        private readonly IPdfCoordinateExtractor _coordinateExtractor;
        private readonly ICoordinateCacheService _coordinateCache;
        private readonly IWebHostEnvironment _env;

        public DocumentsController(
            VeritasDbContext context,
            IPdfCoordinateExtractor coordinateExtractor,
            ICoordinateCacheService coordinateCache,
            IWebHostEnvironment env)
        {
            _context = context;
            _coordinateExtractor = coordinateExtractor;
            _coordinateCache = coordinateCache;
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
                return BadRequest(new { error = "No file uploaded or file is empty." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".pdf" && extension != ".md" && extension != ".txt")
            {
                return BadRequest(new { error = "Only .pdf, .md, and .txt files are supported." });
            }

            var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads");
            if (!Directory.Exists(uploadsDir))
            {
                Directory.CreateDirectory(uploadsDir);
            }

            var docId = Guid.NewGuid();
            var safeFileName = $"{docId}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsDir, safeFileName);

            string checksum;
            using (var sha256 = SHA256.Create())
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
                stream.Position = 0;
                var hashBytes = await sha256.ComputeHashAsync(stream);
                checksum = Convert.ToHexString(hashBytes).ToLowerInvariant();
            }

            int totalPages = 1;
            if (extension == ".pdf")
            {
                try
                {
                    using var pdf = PdfDocument.Open(filePath);
                    totalPages = Math.Max(1, pdf.NumberOfPages);
                }
                catch
                {
                    totalPages = 1;
                }
            }

            var doc = new Document
            {
                Id = docId,
                Name = Path.GetFileName(file.FileName),
                FilePath = Path.Combine("uploads", safeFileName).Replace("\\", "/"),
                MimeType = file.ContentType ?? (extension == ".pdf" ? "application/pdf" : "text/plain"),
                FileSizeBytes = file.Length,
                TotalPages = totalPages,
                Checksum = checksum,
                Status = "indexed",
                MetadataJson = JsonSerializer.Serialize(new
                {
                    originalFileName = Path.GetFileName(file.FileName),
                    uploadedAt = DateTime.UtcNow.ToString("O"),
                    parser = extension == ".pdf" ? "PdfPig-XYCut-v1" : "TextStream"
                }),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Documents.AddAsync(doc);

            var extractedChunks = new List<DocumentChunk>();

            if (extension == ".pdf")
            {
                try
                {
                    extractedChunks = await _coordinateExtractor.ExtractChunksWithBBoxAsync(filePath, doc.Id, HttpContext.RequestAborted);
                    if (extractedChunks.Count > 0)
                    {
                        await _context.DocumentChunks.AddRangeAsync(extractedChunks);
                    }
                }
                catch (Exception ex)
                {
                    var fallbackChunk = new DocumentChunk
                    {
                        Id = Guid.NewGuid(),
                        DocumentId = doc.Id,
                        ChunkIndex = 0,
                        ReadingOrder = 0,
                        ColumnIndex = 0,
                        CharStartIndex = 0,
                        CharEndIndex = 0,
                        BlockType = "paragraph",
                        PageNumber = 1,
                        Content = $"Extracted content from {doc.Name} (Parsing notice: {ex.Message})",
                        TokenCount = 20,
                        Bbox = new BoundingBox(0.05, 0.05, 0.9, 0.9),
                        LineBboxes = new List<LineBoundingBox>(),
                        CreatedAt = DateTime.UtcNow
                    };
                    fallbackChunk.CharEndIndex = fallbackChunk.Content.Length;
                    extractedChunks.Add(fallbackChunk);
                    await _context.DocumentChunks.AddAsync(fallbackChunk);
                }
            }
            else
            {
                var textContent = await System.IO.File.ReadAllTextAsync(filePath);
                var snippet = textContent.Length > 2000 ? textContent[..2000] : textContent;
                var textChunk = new DocumentChunk
                {
                    Id = Guid.NewGuid(),
                    DocumentId = doc.Id,
                    ChunkIndex = 0,
                    ReadingOrder = 0,
                    ColumnIndex = 0,
                    CharStartIndex = 0,
                    CharEndIndex = snippet.Length,
                    BlockType = "paragraph",
                    PageNumber = 1,
                    Content = snippet,
                    TokenCount = (int)Math.Ceiling(textContent.Length / 4.0),
                    Bbox = new BoundingBox(0.05, 0.05, 0.9, 0.9),
                    LineBboxes = new List<LineBoundingBox>
                    {
                        new LineBoundingBox(0.05, 0.05, 0.9, 0.9, 0, snippet.Length)
                    },
                    CreatedAt = DateTime.UtcNow
                };
                extractedChunks.Add(textChunk);
                await _context.DocumentChunks.AddAsync(textChunk);
            }

            await _context.SaveChangesAsync();

            // Warm IMemoryCache immediately so first page render hits cached coordinates
            if (extractedChunks.Count > 0)
            {
                _coordinateCache.WarmDocumentCache(doc.Id, extractedChunks);
            }

            return CreatedAtAction(nameof(GetDocument), new { id = doc.Id }, doc);
        }
    }
}
