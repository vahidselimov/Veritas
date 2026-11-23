using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;
using Veritas.Core.Domain.Entities;

namespace Veritas.Core.Infrastructure.Data
{
    public class VeritasDbContext : DbContext
    {
        public VeritasDbContext(DbContextOptions<VeritasDbContext> options)
            : base(options)
        {
        }

        public DbSet<Document> Documents => Set<Document>();
        public DbSet<DocumentChunk> DocumentChunks => Set<DocumentChunk>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.HasPostgresExtension("vector");

            // 1. Documents mapping
            modelBuilder.Entity<Document>(entity =>
            {
                entity.ToTable("documents");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name").IsRequired();
                entity.Property(e => e.FilePath).HasColumnName("file_path").IsRequired();
                entity.Property(e => e.MimeType).HasColumnName("mime_type").HasDefaultValue("application/pdf");
                entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes").IsRequired();
                entity.Property(e => e.TotalPages).HasColumnName("total_pages").HasDefaultValue(1);
                entity.Property(e => e.Checksum).HasColumnName("checksum").IsRequired();
                entity.Property(e => e.Status).HasColumnName("status").HasDefaultValue("indexed");
                entity.Property(e => e.MetadataJson).HasColumnName("metadata").HasColumnType("jsonb");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // 2. DocumentChunks mapping
            modelBuilder.Entity<DocumentChunk>(entity =>
            {
                entity.ToTable("document_chunks");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.DocumentId).HasColumnName("document_id").IsRequired();
                entity.Property(e => e.ChunkIndex).HasColumnName("chunk_index").IsRequired();
                entity.Property(e => e.PageNumber).HasColumnName("page_number").IsRequired();
                entity.Property(e => e.Content).HasColumnName("content").IsRequired();
                entity.Property(e => e.TokenCount).HasColumnName("token_count").IsRequired();
                entity.Property(e => e.Embedding).HasColumnName("embedding");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");

                // BBox as JSON conversion
                entity.Property(e => e.Bbox)
                    .HasColumnName("bbox")
                    .HasColumnType("jsonb")
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => JsonSerializer.Deserialize<BoundingBox>(v, (JsonSerializerOptions?)null) ?? new BoundingBox()
                    );

                entity.HasOne(e => e.Document)
                    .WithMany()
                    .HasForeignKey(e => e.DocumentId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
