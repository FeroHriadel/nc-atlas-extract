using System.Text.Json;
using App.Dtos;
using App.Interfaces;
using Microsoft.AspNetCore.Mvc;



namespace App.Controllers;



public class ExtractionController(
    IRequestCheckService requestCheckService,
    IExtractionService extractionService,
    ISourcesTableService sourcesTableService,
    IExtractionsTableService extractionsTableService,
    IS3Service s3Service,
    IPdfTextService pdfTextService,
    IQueueService queueService,
    ILogger<ExtractionController> logger
) : BaseAppController
{
    private static readonly JsonSerializerOptions _camelCase = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };



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
