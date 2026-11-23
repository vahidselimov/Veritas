using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Veritas.Core.Domain.Entities;
using Veritas.Core.Infrastructure.Data;

namespace Veritas.Core.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly VeritasDbContext _context;

        public DocumentsController(VeritasDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Document>>> GetDocuments()
        {
            return await _context.Documents.ToListAsync();
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
    }
}
