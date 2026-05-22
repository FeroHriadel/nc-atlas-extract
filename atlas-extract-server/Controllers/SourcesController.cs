using Microsoft.AspNetCore.Mvc;
using App.Dtos;
using App.Interfaces;



namespace App.Controllers;



public class SourcesController(
    IS3Service s3Service, 
    ISourcesTableService sourcesTableService,
    IRequestCheckService requestCheckService) : BaseAppController
{


    // CREATE DYNAMODB SOURCE RECORD
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



    // LIST DYNAMODB SOURCES RECORDS
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


}