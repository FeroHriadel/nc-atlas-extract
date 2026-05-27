using Microsoft.AspNetCore.Mvc;
using App.Dtos;
using App.Interfaces;



namespace App.Controllers;



public class SourcesController(
    IS3Service s3Service, 
    ISourcesTableService sourcesTableService,
    IRequestCheckService requestCheckService) : BaseAppController
{


    //// DYNAMODB SOURCES ENDPOINTS //////////////////////
    // CREATE DYNAMODB SOURCE RECORD => POST /api/sources
    [HttpPost]
    public async Task<IActionResult> CreateDynamoDbSource([FromBody] SourceCreateReq req)
    {
        // check payload
        var requiredFields = new[]
        {
            new RequiredField { Name = "friendlyName", Type = "string" },
            new RequiredField { Name = "type", Type = "string" },
            new RequiredField { Name = "objectKey", Type = "string" }
        };
        var errors = requestCheckService.CheckRequest(req, requiredFields);
        if (errors.Any())
            return BadRequest(new ErrorRes { StatusCode = 400, Message = string.Join(", ", errors) });

        try
        {
            // map request to source
            var source = new Source
            {
                Id = Guid.NewGuid().ToString(),
                FriendlyName = req.FriendlyName,
                Title = req.Title,
                Author = req.Author,
                Description = req.Description,
                Type = req.Type,
                Url = req.Url,
                ISBN = req.ISBN,
                ObjectKey = req.ObjectKey,
                CreatedBy = "developer",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            // save source to dynamodb
            await sourcesTableService.CreateSource(source);
            return Ok(new SourceRes { Source = source });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }


    // GET DYNAMODB SOURCE BY ID => GET /api/sources/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDynamoDbSourceById(string id)
    {
        try
        {
            var source = await sourcesTableService.GetSourceById(id);
            return Ok(new SourceRes { Source = source });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"Source {id} not found." });
        }
        catch (Exception ex)        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }


    // UPDATE DYNAMODB SOURCE => PUT /api/sources/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDynamoDbSource(string id, [FromBody] Source req)
    {
        // check payload
        var requiredFields = new[]
        {
            new RequiredField { Name = "friendlyName", Type = "string" },
            new RequiredField { Name = "type", Type = "string" },
            new RequiredField { Name = "objectKey", Type = "string" }
        };
        var errors = requestCheckService.CheckRequest(req, requiredFields);
        if (errors.Any())
            return BadRequest(new ErrorRes { StatusCode = 400, Message = string.Join(", ", errors) });

        try
        {
            var source = await sourcesTableService.GetSourceById(id);

            // update source properties
            source.FriendlyName = req.FriendlyName;
            source.Title = req.Title;
            source.Author = req.Author;
            source.Description = req.Description;
            source.Type = req.Type;
            source.Url = req.Url;
            source.ISBN = req.ISBN;
            source.ObjectKey = req.ObjectKey;
            source.UpdatedAt = DateTime.UtcNow;

            await sourcesTableService.UpdateSource(source);
            return Ok(new SourceRes { Source = source });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"Source {id} not found." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }


    // DELETE DYNAMODB SOURCE => DELETE /api/sources/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDynamoDbSource(string id)
    {
        try
        {
            var source = await sourcesTableService.GetSourceById(id); // throws KeyNotFoundException if not found
            await sourcesTableService.DeleteSource(id);
            await s3Service.DeleteSource(source.ObjectKey); // also delete S3 object
            return Ok(new { message = $"Source {id} deleted." });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"Source {id} not found." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }



    //// S3 MULTIPART UPLOAD ENDPOINTS /////////////////////////
    // INIT S3 MULTIPART UPLOAD => POST /api/sources/init-upload
    [HttpPost("init-upload")]
    public async Task<IActionResult> InitMultipartUpload([FromBody] InitMultipartUploadReq req)
    {
        var requiredFields = new[]
        {
            new RequiredField { Name = "fileName", Type = "string" },
            new RequiredField { Name = "contentType", Type = "string" }
        };
        var errors = requestCheckService.CheckRequest(req, requiredFields);
        if (errors.Any())
            return BadRequest(new ErrorRes { StatusCode = 400, Message = string.Join(", ", errors) });

        try
        {
            var result = await s3Service.InitMultipartUpload(req.FileName, req.ContentType);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }



    // GET PRESIGNED URL FOR UPLOAD PART => GET /api/sources/presigned-url?uploadId=...&objectKey=...&partNumber=...
    [HttpGet("presigned-url")]
    public async Task<IActionResult> GetPresignedUrl([FromQuery] string uploadId, [FromQuery] string objectKey, [FromQuery] int partNumber)
    {
        if (string.IsNullOrEmpty(uploadId) || string.IsNullOrEmpty(objectKey) || partNumber < 1)
            return BadRequest(new ErrorRes { StatusCode = 400, Message = "uploadId, objectKey and partNumber (>= 1) are required." });

        try
        {
            var url = await s3Service.GetPresignedUploadUrl(uploadId, objectKey, partNumber);
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }



    // COMPLETE MULTIPART UPLOAD => POST /api/sources/complete-upload
    [HttpPost("complete-upload")]
    public async Task<IActionResult> CompleteMultipartUpload([FromBody] CompleteMultipartUploadReq req)
    {
        if (string.IsNullOrEmpty(req.UploadId) || string.IsNullOrEmpty(req.ObjectKey) || req.Parts == null || req.Parts.Count == 0)
            return BadRequest(new ErrorRes { StatusCode = 400, Message = "uploadId, objectKey and at least one part are required." });

        try
        {
            await s3Service.CompleteMultipartUpload(req.UploadId, req.ObjectKey, req.Parts);
            return Ok(new { message = "Upload complete.", objectKey = req.ObjectKey });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }



    // ABORT MULTIPART UPLOAD => DELETE /api/sources/abort-upload?uploadId=...&objectKey=...
    [HttpDelete("abort-upload")]
    public async Task<IActionResult> AbortMultipartUpload([FromQuery] string uploadId, [FromQuery] string objectKey)
    {
        if (string.IsNullOrEmpty(uploadId) || string.IsNullOrEmpty(objectKey))
            return BadRequest(new ErrorRes { StatusCode = 400, Message = "uploadId and objectKey are required." });

        try
        {
            await s3Service.AbortMultipartUpload(uploadId, objectKey);
            return Ok(new { message = "Upload aborted." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }



    // LIST DYNAMODB SOURCES RECORDS => GET /api/sources
    [HttpGet]
    public async Task<IActionResult> ListDynamoDbSources()
    {
        try
        {
            var sources = await sourcesTableService.GetSources() ?? [];
            return Ok(new SourcesResDto { Sources = sources });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }


    // GET PRESIGNED URL FOR DOWNLOADING AN OBJECT => GET /api/sources/download-url/{id}
    [HttpGet("download-url/{id}")] 
    public async Task<IActionResult> GetDownloadUrl(string id)
    {
        try
        {
            var source = await sourcesTableService.GetSourceById(id);
            var url = await s3Service.GetPresignedDownloadUrl(source.ObjectKey);
            return Ok(new { url });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"Source {id} not found." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = ex.Message });
        }
    }


}