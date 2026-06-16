using System.Text.Json;
using System.Text.RegularExpressions;
using App.Dtos;
using App.Interfaces;
using Microsoft.AspNetCore.Mvc;



namespace App.Controllers;



public class ExtractionController(
    IRequestCheckService requestCheckService,
    IExtractionService extractionService,
    ISourcesTableService sourcesTableService,
    IExtractionsTableService extractionsTableService,
    IEnrichmentsTableService enrichmentsTableService,
    IS3Service s3Service,
    IPdfTextService pdfTextService,
    IQueueService queueService,
    IEnrichmentQueueService enrichmentQueueService,
    ILogger<ExtractionController> logger
) : BaseAppController
{
    private static readonly JsonSerializerOptions _camelCase = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private static string Slugify(string s) => Regex.Replace(s.ToLower(), @"[^a-z0-9]+", "-").Trim('-');



    // EXTRACT SAMPLE => POST /api/extraction/sample
    [HttpPost("sample")]
    public async Task<IActionResult> ExtractSample([FromBody] ExtractReq req)
    {
        var requiredFields = new[]
        {
            new RequiredField { Name = "text", Type = "string" },
            new RequiredField { Name = "startPage", Type = "int" },
            new RequiredField { Name = "endPage", Type = "int" },
            new RequiredField { Name = "sourceId", Type = "string" },
            new RequiredField { Name = "sourceLanguage", Type = "string" },
            new RequiredField { Name = "sourceTopic", Type = "string" },
            new RequiredField { Name = "structureDescription", Type = "string" },
            new RequiredField { Name = "descriptionLength", Type = "string" }
        };
        var errors = requestCheckService.CheckRequest(req, requiredFields);
        if (errors.Any())
            return BadRequest(new ErrorRes { StatusCode = 400, Message = string.Join(", ", errors) });

        try
        {
            var res = await extractionService.Extract(req);
            return Ok(res);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during sample extraction");
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred during extraction." });
        }
    }



    // START FULL EXTRACTION => POST /api/extraction/start
    [HttpPost("start")]
    public async Task<IActionResult> StartExtraction([FromBody] ExtractionStartReq req)
    {
        var requiredFields = new[]
        {
            new RequiredField { Name = "sourceId", Type = "string" },
            new RequiredField { Name = "friendlyName", Type = "string" },
            new RequiredField { Name = "sourceLanguage", Type = "string" },
            new RequiredField { Name = "sourceTopic", Type = "string" },
            new RequiredField { Name = "structureDescription", Type = "string" },
            new RequiredField { Name = "descriptionLength", Type = "string" },
        };
        var errors = requestCheckService.CheckRequest(req, requiredFields);
        if (errors.Any())
            return BadRequest(new ErrorRes { StatusCode = 400, Message = string.Join(", ", errors) });

        if (req.PageRanges == null || req.PageRanges.Length == 0)
            return BadRequest(new ErrorRes { StatusCode = 400, Message = "pageRanges must contain at least one range." });

        try
        {
            // get source to resolve the S3 key
            Source source;
            try { source = await sourcesTableService.GetSourceById(req.SourceId); }
            catch (KeyNotFoundException) { return NotFound(new ErrorRes { StatusCode = 404, Message = $"Source {req.SourceId} not found." }); }

            // download the PDF once and extract text for all page ranges in one pass
            using var pdfStream = await s3Service.GetObjectStreamAsync(source.ObjectKey);
            var batchTexts = pdfTextService.ExtractRanges(pdfStream, req.PageRanges);

            // create Extraction record
            var extractionId = Guid.NewGuid().ToString();
            var extraction = new Extraction
            {
                Id                   = extractionId,
                FriendlyName         = req.FriendlyName,
                SourceId             = req.SourceId,
                SourceS3Key          = source.ObjectKey,
                SourceLanguage       = req.SourceLanguage,
                SourceTopic          = req.SourceTopic,
                StructureDescription = req.StructureDescription,
                Ignore               = req.Ignore,
                DescriptionLength    = req.DescriptionLength,
                AdditionalInstructions = req.AdditionalInstructions,
                Pages                = req.PageRanges,
                TotalBatches         = req.PageRanges.Length,
                CompletedBatches     = 0,
                FailedBatches        = 0,
                Status               = "pending",
                CreatedAt            = DateTime.UtcNow,
                CompletedAt          = null,
                Batches              = req.PageRanges.Select(r => new BatchStatus
                {
                    StartPage = r.StartPage,
                    EndPage   = r.EndPage,
                    Status    = "pending",
                }).ToArray(),
            };
            await extractionsTableService.CreateExtractionAsync(extraction);

            // enqueue one SQS message per batch
            var messages = batchTexts.Select((text, i) => JsonSerializer.Serialize(
                new { extractionId, batchIndex = i, text },
                _camelCase
            ));
            await queueService.SendBatchMessagesAsync(messages);

            return Ok(new ExtractionStartRes { ExtractionId = extractionId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error starting extraction for source {SourceId}", req.SourceId);
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while starting extraction." });
        }
    }



    // GET EXTRACTION BY ID (for FE polling) => GET /api/extraction/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetExtractionAsync(string id)
    {
        try
        {
            var extraction = await extractionsTableService.GetExtractionAsync(id);
            return Ok(extraction);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"Extraction {id} not found." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching extraction {ExtractionId}", id);
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while fetching the extraction." });
        }
    }



    // DELETE EXTRACTION => DELETE /api/extraction/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExtractionAsync(string id)
    {
        Extraction extraction;
        try { extraction = await extractionsTableService.GetExtractionAsync(id); }
        catch (KeyNotFoundException) { return NotFound(new ErrorRes { StatusCode = 404, Message = $"Extraction {id} not found." }); }

        try
        {
            // delete each batch result JSON from S3 (fire-and-forget errors — partial cleanup is acceptable)
            var s3Deletions = extraction.Batches
                .Where(b => b.S3ResultKey != null)
                .Select(b => s3Service.DeleteSource(b.S3ResultKey!));
            await Task.WhenAll(s3Deletions);

            await extractionsTableService.DeleteExtractionAsync(id);
            return Ok(new { message = $"Extraction {id} deleted." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting extraction {ExtractionId}", id);
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while deleting the extraction." });
        }
    }



    // GET PRESIGNED DOWNLOAD URLS FOR BATCH RESULT JSON FILES => GET /api/extraction/{id}/json
    [HttpGet("{id}/json")]
    public async Task<IActionResult> GetExtractionJsonUrls(string id)
    {
        Extraction extraction;
        try { extraction = await extractionsTableService.GetExtractionAsync(id); }
        catch (KeyNotFoundException) { return NotFound(new ErrorRes { StatusCode = 404, Message = $"Extraction {id} not found." }); }

        try
        {
            var batches = new List<ExtractionBatchUrlRes>();
            for (int i = 0; i < extraction.Batches.Length; i++)
            {
                var batch = extraction.Batches[i];
                if (batch.S3ResultKey is null) continue;
                var url = await s3Service.GetPresignedDownloadUrl(batch.S3ResultKey);
                batches.Add(new ExtractionBatchUrlRes
                {
                    BatchIndex = i,
                    StartPage  = batch.StartPage,
                    EndPage    = batch.EndPage,
                    Url        = url,
                });
            }
            return Ok(new ExtractionJsonRes { ExtractionId = id, Batches = batches });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error generating JSON URLs for extraction {ExtractionId}", id);
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while generating download URLs." });
        }
    }



    // START ENRICHMENT => POST /api/extraction/{id}/enrich
    [HttpPost("{id}/enrich")]
    public async Task<IActionResult> StartEnrichment(string id, [FromBody] EnrichmentStartReq req)
    {
        if (!req.GpsEnabled && !req.ImagesEnabled)
            return BadRequest(new ErrorRes { StatusCode = 400, Message = "At least one of gpsEnabled or imagesEnabled must be true." });

        if (req.GpsEnabled && string.IsNullOrWhiteSpace(req.Country))
            return BadRequest(new ErrorRes { StatusCode = 400, Message = "country is required when gpsEnabled is true." });

        Extraction extraction;
        try { extraction = await extractionsTableService.GetExtractionAsync(id); }
        catch (KeyNotFoundException) { return NotFound(new ErrorRes { StatusCode = 404, Message = $"Extraction {id} not found." }); }

        var existing = await enrichmentsTableService.GetEnrichmentAsync(id);
        if (existing?.Status == "processing")
            return Conflict(new ErrorRes { StatusCode = 409, Message = $"Enrichment for extraction {id} is already in progress." });

        try
        {
            var items = new List<ExtractedItem>();
            foreach (var batch in extraction.Batches)
            {
                if (batch.S3ResultKey is null) continue;
                using var stream = await s3Service.GetObjectStreamAsync(batch.S3ResultKey);
                var result = await JsonSerializer.DeserializeAsync<ExtractRes>(stream, _camelCase);
                if (result?.Summary != null) items.AddRange(result.Summary);
            }

            var dateStr    = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var nameSlug   = Slugify(extraction.FriendlyName);
            var enrichment = new Enrichment
            {
                ExtractionId   = id,
                GpsEnabled     = req.GpsEnabled,
                ImagesEnabled  = req.ImagesEnabled,
                Country        = req.Country,
                TotalItems     = items.Count,
                CompletedItems = 0,
                FailedItems    = 0,
                Status         = "processing",
                StartedAt      = DateTime.UtcNow,
                CompletedAt    = null,
                Items = items.Select(i => new EnrichmentItem
                {
                    Title  = i.Title,
                    Status = "pending",
                }).ToArray(),
            };
            await enrichmentsTableService.PutEnrichmentAsync(enrichment);

            var messages = items.Select((item, index) => JsonSerializer.Serialize(new
            {
                extractionId = id,
                itemIndex    = index,
                title        = item.Title,
                description  = item.Description,
                category     = item.Category,
                tags         = item.Tags,
                gpsEnabled   = req.GpsEnabled,
                imagesEnabled= req.ImagesEnabled,
                country      = req.Country,
                s3BaseKey    = $"enrichments/{dateStr}-{nameSlug}/{Slugify(item.Title)}",
            }, _camelCase));
            await enrichmentQueueService.SendMessagesAsync(messages);

            return Ok(enrichment);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error starting enrichment for extraction {ExtractionId}", id);
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while starting enrichment." });
        }
    }



    // GET ENRICHMENT STATUS (for FE polling) => GET /api/extraction/{id}/enrichment-status
    [HttpGet("{id}/enrichment-status")]
    public async Task<IActionResult> GetEnrichmentStatus(string id)
    {
        try
        {
            var enrichment = await enrichmentsTableService.GetEnrichmentAsync(id);
            return Ok(enrichment);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching enrichment status for extraction {ExtractionId}", id);
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while fetching enrichment status." });
        }
    }



    // GET ENRICHED ITEMS WITH PRESIGNED IMAGE URLS => GET /api/extraction/{id}/enriched-items
    [HttpGet("{id}/enriched-items")]
    public async Task<IActionResult> GetEnrichedItems(string id)
    {
        var enrichment = await enrichmentsTableService.GetEnrichmentAsync(id);
        if (enrichment is null)
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"No enrichment found for extraction {id}." });

        try
        {
            var results = new List<EnrichedItemRes>();
            foreach (var item in enrichment.Items)
            {
                if (item.Status != "completed" || item.S3Folder is null)
                {
                    results.Add(new EnrichedItemRes { Title = item.Title, Status = item.Status, ErrorMessage = item.ErrorMessage });
                    continue;
                }

                StoredEnrichedItem? stored = null;
                try
                {
                    using var stream = await s3Service.GetObjectStreamAsync($"{item.S3Folder}/item.json");
                    stored = await JsonSerializer.DeserializeAsync<StoredEnrichedItem>(stream, _camelCase);
                }
                catch { /* item.json missing — treat as partial */ }

                string? image350Url  = null;
                string? image1024Url = null;
                if (enrichment.ImagesEnabled)
                {
                    try { image350Url  = await s3Service.GetPresignedDownloadUrl($"{item.S3Folder}/350.png");  } catch { }
                    try { image1024Url = await s3Service.GetPresignedDownloadUrl($"{item.S3Folder}/1024.png"); } catch { }
                }

                results.Add(new EnrichedItemRes
                {
                    Title        = item.Title,
                    Status       = item.Status,
                    Description  = stored?.Description,
                    Category     = stored?.Category,
                    Tags         = stored?.Tags,
                    Location     = stored?.Location,
                    Image350Url  = image350Url,
                    Image1024Url = image1024Url,
                });
            }

            return Ok(results);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error loading enriched items for extraction {ExtractionId}", id);
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while loading enriched items." });
        }
    }



    // GET ALL EXTRACTIONS => GET /api/extractions
    [HttpGet("extractions")]
    public async Task<IActionResult> GetExtractions()
    {
        try
        {
            var extractions = await extractionsTableService.GetExtractionsAsync();
            return Ok(extractions);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"No extractions found." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching extractions");
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while fetching extractions." });
        }
    }
}
