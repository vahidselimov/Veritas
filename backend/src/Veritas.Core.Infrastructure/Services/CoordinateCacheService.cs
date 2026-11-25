using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Veritas.Core.Domain.Entities;
using Veritas.Core.Domain.Interfaces;
using Veritas.Core.Infrastructure.Data;

namespace Veritas.Core.Infrastructure.Services
{
    /// <summary>
    /// Normalized bounding box and layout coordinate cache backed by IMemoryCache and PostgreSQL.
    /// Eliminates redundant DB/JSON deserialization during canvas page flips and citation jumps.
    /// </summary>
    public class CoordinateCacheService : ICoordinateCacheService
    {
        private readonly IMemoryCache _cache;
        private readonly VeritasDbContext _context;

        private static readonly MemoryCacheEntryOptions EntryOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(TimeSpan.FromMinutes(30))
            .SetAbsoluteExpiration(TimeSpan.FromHours(4));

        public CoordinateCacheService(IMemoryCache cache, VeritasDbContext context)
        {
            _cache = cache;
            _context = context;
        }

        private string GetVersionKey(Guid documentId) => $"veritas:coord:ver:{documentId}";

        private long GetCurrentVersion(Guid documentId)
        {
            var versionKey = GetVersionKey(documentId);
            if (!_cache.TryGetValue(versionKey, out long version))
            {
                version = 1;
                _cache.Set(versionKey, version, EntryOptions);
            }
            return version;
        }

        private string GetDataKey(Guid documentId, long version, int? pageNumber) =>
            $"veritas:coord:data:{documentId}:v{version}:p{(pageNumber.HasValue ? pageNumber.Value.ToString() : "all")}";

        public async Task<CoordinateCacheResult> GetOrLoadChunksAsync(
            Guid documentId,
            int? pageNumber = null,
            CancellationToken cancellationToken = default)
        {
            var sw = Stopwatch.StartNew();
            long version = GetCurrentVersion(documentId);
            string cacheKey = GetDataKey(documentId, version, pageNumber);

            if (_cache.TryGetValue(cacheKey, out List<DocumentChunk>? cachedChunks) && cachedChunks != null)
            {
                sw.Stop();
                return BuildResult(documentId, pageNumber, cachedChunks, cacheHit: true, sw.Elapsed.TotalMilliseconds);
            }

            var query = _context.DocumentChunks
                .AsNoTracking()
                .Where(c => c.DocumentId == documentId);

            if (pageNumber.HasValue)
            {
                query = query.Where(c => c.PageNumber == pageNumber.Value);
            }

            var loadedChunks = await query
                .OrderBy(c => c.PageNumber)
                .ThenBy(c => c.ReadingOrder)
                .ThenBy(c => c.ChunkIndex)
                .ToListAsync(cancellationToken);

            _cache.Set(cacheKey, loadedChunks, EntryOptions);

            // Also warm per-page buckets if the full document was fetched
            if (!pageNumber.HasValue && loadedChunks.Count > 0)
            {
                foreach (var pageGroup in loadedChunks.GroupBy(c => c.PageNumber))
                {
                    var pageKey = GetDataKey(documentId, version, pageGroup.Key);
                    _cache.Set(pageKey, pageGroup.ToList(), EntryOptions);
                }
            }

            sw.Stop();
            return BuildResult(documentId, pageNumber, loadedChunks, cacheHit: false, sw.Elapsed.TotalMilliseconds);
        }

        public void WarmDocumentCache(Guid documentId, IEnumerable<DocumentChunk> chunks)
        {
            long newVersion = DateTime.UtcNow.Ticks;
            _cache.Set(GetVersionKey(documentId), newVersion, EntryOptions);

            var chunkList = chunks
                .OrderBy(c => c.PageNumber)
                .ThenBy(c => c.ReadingOrder)
                .ThenBy(c => c.ChunkIndex)
                .ToList();

            _cache.Set(GetDataKey(documentId, newVersion, null), chunkList, EntryOptions);

            foreach (var pageGroup in chunkList.GroupBy(c => c.PageNumber))
            {
                _cache.Set(GetDataKey(documentId, newVersion, pageGroup.Key), pageGroup.ToList(), EntryOptions);
            }
        }

        public void InvalidateDocumentCache(Guid documentId)
        {
            _cache.Set(GetVersionKey(documentId), DateTime.UtcNow.Ticks, EntryOptions);
        }

        private static CoordinateCacheResult BuildResult(
            Guid documentId,
            int? pageNumber,
            List<DocumentChunk> chunks,
            bool cacheHit,
            double elapsedMs)
        {
            int columnCount = chunks.Count > 0
                ? chunks.Max(c => c.ColumnIndex) + 1
                : 0;

            int totalChars = chunks.Count > 0
                ? chunks.Max(c => c.CharEndIndex)
                : 0;

            return new CoordinateCacheResult
            {
                DocumentId = documentId,
                PageNumber = pageNumber,
                CacheHit = cacheHit,
                LookupMs = Math.Round(elapsedMs, 3),
                ColumnCount = columnCount,
                TotalCharacters = totalChars,
                Chunks = chunks
            };
        }
    }
}
