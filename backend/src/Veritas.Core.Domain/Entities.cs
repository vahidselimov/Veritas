using System;
using System.Text.Json.Serialization;
using Pgvector;

namespace Veritas.Core.Domain.Entities
{
    public class BoundingBox
    {
        [JsonPropertyName("x")]
        public double X { get; set; } // 0.0 - 1.0 (relative to page width)

        [JsonPropertyName("y")]
        public double Y { get; set; } // 0.0 - 1.0 (relative to page height)

        [JsonPropertyName("w")]
        public double W { get; set; } // 0.0 - 1.0

        [JsonPropertyName("h")]
        public double H { get; set; } // 0.0 - 1.0

        public BoundingBox() { }

        public BoundingBox(double x, double y, double w, double h)
        {
            X = x;
            Y = y;
            W = w;
            H = h;
        }
    }

    public class Document
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string MimeType { get; set; } = "application/pdf";
        public long FileSizeBytes { get; set; }
        public int TotalPages { get; set; } = 1;
        public string Checksum { get; set; } = string.Empty;
        public string Status { get; set; } = "indexed"; // 'uploading', 'processing', 'indexed', 'failed'
        public string MetadataJson { get; set; } = "{}";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class DocumentChunk
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid DocumentId { get; set; }
        public Document? Document { get; set; }
        public int ChunkIndex { get; set; }
        public int PageNumber { get; set; }
        public string Content { get; set; } = string.Empty;
        public BoundingBox Bbox { get; set; } = new BoundingBox();
        public int TokenCount { get; set; }
        
        [JsonIgnore]
        public Vector? Embedding { get; set; } // 1536-dimensional vector via Pgvector
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
