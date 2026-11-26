using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Veritas.Core.Domain.Entities;

namespace Veritas.Core.Domain.Interfaces
{
    public interface IPdfCoordinateExtractor
    {
        Task<List<DocumentChunk>> ExtractChunksWithBBoxAsync(
            string filePath,
            Guid documentId,
            CancellationToken cancellationToken = default
        );
    }

    public class CoordinateCacheResult
    {
        public Guid DocumentId { get; set; }
        public int? PageNumber { get; set; }
        public bool CacheHit { get; set; }
        public double LookupMs { get; set; }
        public int ColumnCount { get; set; }
        public int TotalCharacters { get; set; }
        public List<DocumentChunk> Chunks { get; set; } = new();
    }

    public interface ICoordinateCacheService
    {
        Task<CoordinateCacheResult> GetOrLoadChunksAsync(
            Guid documentId,
            int? pageNumber = null,
            CancellationToken cancellationToken = default
        );

        void WarmDocumentCache(Guid documentId, IEnumerable<DocumentChunk> chunks);
        void InvalidateDocumentCache(Guid documentId);
    }

    public class IngestionValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorCode { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
        public string Extension { get; set; } = string.Empty;
        public bool HasOpenAction { get; set; }
    }

    public class BatchIngestionItemResult
    {
        public string FileName { get; set; } = string.Empty;
        public string Status { get; set; } = "indexed"; // indexed | duplicate | ocr_required | rejected
        public bool IsDuplicate { get; set; }
        public int ChunkCount { get; set; }
        public int TotalPages { get; set; }
        public string? ErrorCode { get; set; }
        public string? ErrorMessage { get; set; }
        public Document? Document { get; set; }
    }

    public class BatchIngestionResponse
    {
        public int TotalFiles { get; set; }
        public int IndexedCount { get; set; }
        public int DuplicateCount { get; set; }
        public int OcrRequiredCount { get; set; }
        public int RejectedCount { get; set; }
        public List<BatchIngestionItemResult> Results { get; set; } = new();
    }

    public interface IIngestionValidationService
    {
        IngestionValidationResult ValidateUpload(string fileName, long length, byte[] headerAndSampleBytes);
        string SanitizeExtractedText(string rawText);
    }

    public class SearchCandidate
    {
        public DocumentChunk Chunk { get; set; } = new DocumentChunk();
        public double DenseScore { get; set; }
        public double SparseScore { get; set; }
        public double RrfScore { get; set; }
    }

    public interface IHybridSearchService
    {
        Task<List<SearchCandidate>> SearchAsync(
            string query,
            float[] queryEmbedding,
            double denseWeight = 0.65,
            int topK = 40,
            CancellationToken cancellationToken = default
        );
    }
}
