using System;
using System.IO;
using System.Linq;
using System.Text;
using Veritas.Core.Domain.Interfaces;

namespace Veritas.Core.Infrastructure.Services
{
    /// <summary>
    /// Validates uploaded documents at ingestion time: size bounds, file signature magic bytes,
    /// dangerous active PDF action detection, and control-character sanitization.
    /// </summary>
    public class IngestionValidationService : IIngestionValidationService
    {
        public const long MaxFileSizeBytes = 125_829_120; // 120 MB

        private static readonly string[] AllowedExtensions = { ".pdf", ".md", ".txt" };

        private static readonly string[] BlockedPdfTokens =
        {
            "/JavaScript",
            "/JS ",
            "/JS(",
            "/JS<",
            "/Launch",
            "/SubmitForm",
            "/ImportData"
        };

        public IngestionValidationResult ValidateUpload(string fileName, long length, byte[] sampleBytes)
        {
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return Fail("INVALID_NAME", "File name is missing.");
            }

            if (length <= 0 || sampleBytes.Length == 0)
            {
                return Fail("EMPTY_FILE", $"File '{fileName}' is empty (0 bytes).");
            }

            if (length > MaxFileSizeBytes)
            {
                return Fail("FILE_TOO_LARGE", $"File '{fileName}' exceeds the 120 MB maximum limit.");
            }

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
            {
                return Fail("UNSUPPORTED_EXTENSION", $"Extension '{ext}' is not supported. Allowed: .pdf, .md, .txt.");
            }

            if (ext == ".pdf")
            {
                if (!HasPdfMagicSignature(sampleBytes))
                {
                    return Fail(
                        "INVALID_PDF_HEADER",
                        $"File '{fileName}' does not have a valid %PDF- binary header signature."
                    );
                }

                // Scan raw PDF dictionary tokens in ASCII/Latin1 view for executable/script triggers
                string asciiScan = Encoding.Latin1.GetString(sampleBytes);
                foreach (var token in BlockedPdfTokens)
                {
                    if (asciiScan.Contains(token, StringComparison.Ordinal))
                    {
                        return Fail(
                            "SECURITY_ACTIVE_CONTENT_BLOCKED",
                            $"File '{fileName}' rejected by PDF security policy (detected active trigger '{token.Trim()}')."
                        );
                    }
                }

                bool hasOpenAction = asciiScan.Contains("/OpenAction", StringComparison.Ordinal);
                return new IngestionValidationResult
                {
                    IsValid = true,
                    Extension = ext,
                    HasOpenAction = hasOpenAction
                };
            }

            // Plain text / Markdown validation: reject null-byte binary disguised as .txt/.md
            int inspectCount = Math.Min(sampleBytes.Length, 4096);
            for (int i = 0; i < inspectCount; i++)
            {
                if (sampleBytes[i] == 0x00)
                {
                    return Fail(
                        "BINARY_CONTENT_IN_TEXT",
                        $"File '{fileName}' contains binary null bytes and is not valid UTF-8 text."
                    );
                }
            }

            return new IngestionValidationResult
            {
                IsValid = true,
                Extension = ext
            };
        }

        public string SanitizeExtractedText(string rawText)
        {
            if (string.IsNullOrEmpty(rawText)) return string.Empty;

            var sb = new StringBuilder(rawText.Length);
            foreach (char c in rawText)
            {
                // Strip NUL and C0 control chars except tab, LF, CR
                if (c == '\0') continue;
                if (c < ' ' && c != '\t' && c != '\n' && c != '\r') continue;
                sb.Append(c);
            }
            return sb.ToString();
        }

        private static bool HasPdfMagicSignature(byte[] bytes)
        {
            // %PDF- may appear within first 1024 bytes per PDF spec
            int searchLimit = Math.Min(bytes.Length - 5, 1024);
            for (int i = 0; i <= searchLimit; i++)
            {
                if (bytes[i] == (byte)'%' &&
                    bytes[i + 1] == (byte)'P' &&
                    bytes[i + 2] == (byte)'D' &&
                    bytes[i + 3] == (byte)'F' &&
                    bytes[i + 4] == (byte)'-')
                {
                    return true;
                }
            }
            return false;
        }

        private static IngestionValidationResult Fail(string code, string message) =>
            new()
            {
                IsValid = false,
                ErrorCode = code,
                ErrorMessage = message
            };
    }
}
