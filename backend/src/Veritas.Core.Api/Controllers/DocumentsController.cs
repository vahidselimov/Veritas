using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
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
        private readonly IWebHostEnvironment _env;

        public DocumentsController(
            VeritasDbContext context,
            IPdfCoordinateExtractor coordinateExtractor,
            IWebHostEnvironment env)
        {
            _context = context;
            _coordinateExtractor = coordinateExtractor;
            _env = env;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Document>>> GetDocuments()
        {
            return await _context.Documents.OrderByDescending(d => d.CreatedAt).ToListAsync();
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
            var query = _context.DocumentChunks.Where(c => c.DocumentId == id);
            if (pageNumber.HasValue)
            {
                query = query.Where(c => c.PageNumber == pageNumber.Value);
            }
            return await query.OrderBy(c => c.ChunkIndex).ToListAsync();
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

            // Ensure uploads directory exists
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
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
                MetadataJson = $"{{\"originalFileName\": \"{file.FileName}\", \"uploadedAt\": \"{DateTime.UtcNow:O}\"}}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Documents.AddAsync(doc);

            // Extract spatial bounding boxes if PDF
            if (extension == ".pdf")
            {
                try
                {
                    var chunks = await _coordinateExtractor.ExtractChunksWithBBoxAsync(filePath, doc.Id);
                    if (chunks.Count > 0)
                    {
                        await _context.DocumentChunks.AddRangeAsync(chunks);
                    }
                }
                catch (Exception ex)
                {
                    var fallbackChunk = new DocumentChunk
                    {
                        Id = Guid.NewGuid(),
                        DocumentId = doc.Id,
                        ChunkIndex = 0,
                        PageNumber = 1,
                        Content = $"Extracted content from {doc.Name} (Parsing notice: {ex.Message})",
                        TokenCount = 20,
                        Bbox = new BoundingBox(0.05, 0.05, 0.9, 0.9),
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.DocumentChunks.AddAsync(fallbackChunk);
                }
            }
            else
            {
                var textContent = await System.IO.File.ReadAllTextAsync(filePath);
                var textChunk = new DocumentChunk
                {
                    Id = Guid.NewGuid(),
                    DocumentId = doc.Id,
                    ChunkIndex = 0,
                    PageNumber = 1,
                    Content = textContent.Length > 2000 ? textContent[..2000] : textContent,
                    TokenCount = (int)Math.Ceiling(textContent.Length / 4.0),
                    Bbox = new BoundingBox(0.05, 0.05, 0.9, 0.9),
                    CreatedAt = DateTime.UtcNow
                };
                await _context.DocumentChunks.AddAsync(textChunk);
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDocument), new { id = doc.Id }, doc);
        }
    }
}
