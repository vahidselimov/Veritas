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
