using System.Text.Json;
using App.Dtos;
using App.Interfaces;
using Microsoft.AspNetCore.Mvc;



namespace App.Controllers;



public class StatsController(
    IExtractionsTableService extractionsTableService,
    IEnrichmentsTableService enrichmentsTableService,
    IS3Service s3Service,
    ILogger<StatsController> logger
) : BaseAppController
{
    private static readonly JsonSerializerOptions _camelCase = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };



    // GET /api/stats
    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var now = DateTime.UtcNow;

            // --- extractions ---
            Extraction[] extractions;
            try { extractions = await extractionsTableService.GetExtractionsAsync(); }
            catch (KeyNotFoundException) { extractions = []; }

            // fetch item counts for each completed extraction in parallel
            var extractionCounts = await Task.WhenAll(
                extractions
                    .Where(e => e.Status == "completed" && e.CompletedAt.HasValue)
                    .Select(async e =>
                    {
                        int count = 0;
                        foreach (var batch in e.Batches.Where(b => b.Status == "completed" && b.S3ResultKey != null))
                        {
                            try
                            {
                                using var stream = await s3Service.GetObjectStreamAsync(batch.S3ResultKey!);
                                var result = await JsonSerializer.DeserializeAsync<ExtractRes>(stream, _camelCase);
                                count += result?.Summary?.Length ?? 0;
                            }
                            catch { /* batch json missing — skip */ }
                        }
                        return (date: DateOnly.FromDateTime(e.CompletedAt!.Value), count);
                    })
            );

            // --- enrichments ---
            var enrichments = await enrichmentsTableService.GetAllEnrichmentsAsync();

            // --- build per-day buckets ---
            var buckets = new Dictionary<DateOnly, (int extracted, int images, int failedEx, int failedEn)>();

            void Add(DateOnly day, int ex = 0, int img = 0, int fEx = 0, int fEn = 0)
            {
                var (e, i, fe, fen) = buckets.GetValueOrDefault(day);
                buckets[day] = (e + ex, i + img, fe + fEx, fen + fEn);
            }

            foreach (var (date, count) in extractionCounts)
                Add(date, ex: count);

            foreach (var extraction in extractions.Where(e => e.Status == "failed"))
                Add(DateOnly.FromDateTime(extraction.CompletedAt?.Date ?? extraction.CreatedAt.Date), fEx: 1);

            foreach (var enrichment in enrichments)
            {
                if (enrichment.Status == "failed" && enrichment.CompletedAt.HasValue)
                    Add(DateOnly.FromDateTime(enrichment.CompletedAt.Value.Date), fEn: 1);

                if (!enrichment.ImagesEnabled) continue;
                foreach (var item in enrichment.Items.Where(i => i.S3Folder != null))
                {
                    // s3Folder: "enrichments/2026-06-15-slug/item-slug" — date is first 10 chars of second segment
                    var segments = item.S3Folder!.Split('/');
                    if (segments.Length >= 2 && DateOnly.TryParse(segments[1][..Math.Min(10, segments[1].Length)], out var imgDate))
                        Add(imgDate, img: 1);
                }
            }

            // --- this month (day 1 → today) ---
            var thisMonth = Enumerable.Range(1, now.Day)
                .Select(d =>
                {
                    var day = new DateOnly(now.Year, now.Month, d);
                    var (ex, img, fEx, fEn) = buckets.GetValueOrDefault(day);
                    return new DailyStats
                    {
                        Date              = day.ToString("yyyy-MM-dd"),
                        ExtractedItems    = ex,
                        ImagesGenerated   = img,
                        FailedExtractions = fEx,
                        FailedEnrichments = fEn,
                    };
                })
                .ToList();

            // --- overall totals ---
            var overall = new OverallStats
            {
                ExtractedItems    = extractionCounts.Sum(r => r.count),
                ImagesGenerated   = enrichments.Where(e => e.ImagesEnabled).SelectMany(e => e.Items).Count(i => i.S3Folder != null),
                FailedExtractions = extractions.Count(e => e.Status == "failed"),
                FailedEnrichments = enrichments.Count(e => e.Status == "failed"),
            };

            return Ok(new StatsRes { ThisMonth = thisMonth, Overall = overall });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error building stats");
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while building stats." });
        }
    }
}
