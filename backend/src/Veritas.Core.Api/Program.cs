using Microsoft.EntityFrameworkCore;
using Veritas.Core.Domain.Interfaces;
using Veritas.Core.Infrastructure.Data;
using Veritas.Core.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// PostgreSQL connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5433;Database=veritas_corpus;Username=veritas;Password=veritas_secret";

builder.Services.AddDbContext<VeritasDbContext>(options =>
    options.UseNpgsql(connectionString, o => o.UseVector()));

// Register PDF spatial extraction service
builder.Services.AddScoped<IPdfCoordinateExtractor, PdfSpatialParserService>();

// CORS configuration for Next.js BFF
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJs", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "VERITAS // CORPUS Core API (.NET 9)",
        Version = "v1",
        Description = "Enterprise C# .NET 9 High-Throughput Core API for Visual Grounded Deep Research"
    });
});

var app = builder.Build();

// Enable Swagger unconditionally across all environments
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "VERITAS Core API v1 (.NET 9)");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowNextJs");
app.UseAuthorization();
app.MapControllers();

// Convenience endpoints: Redirect root to Swagger and provide /health
app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    framework = "ASP.NET Core 9.0 (.NET 9)",
    database = "PostgreSQL 16 + pgvector (port 5433)",
    engine = "Veritas.Core.Api",
    timestamp = DateTime.UtcNow
}));

app.Run();
