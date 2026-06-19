using App.Dtos;
using App.Interfaces;
using Microsoft.AspNetCore.Mvc;



namespace App.Controllers;



public class ImagesController(
    IRequestCheckService requestCheckService,
    IImageGenService imageGenService,
    ILogger<ImagesController> logger
) : BaseAppController
{
    // START IMAGE GENERATION => POST /api/images/create
    [HttpPost("create")]
    public async Task<IActionResult> CreateImage([FromBody] CreateImageReq req)
    {
        var requiredFields = new[]
        {
            new RequiredField { Name = "title", Type = "string" },
            new RequiredField { Name = "description", Type = "string" },
            new RequiredField { Name = "category", Type = "string" },
        };
        var errors = requestCheckService.CheckRequest(req, requiredFields);
        if (errors.Any())
            return BadRequest(new ErrorRes { StatusCode = 400, Message = string.Join(", ", errors) });

        try
        {
            var jobId = await imageGenService.StartImageGeneration(req);
            return Ok(new { jobId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error starting image generation");
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while starting image generation." });
        }
    }



    // GET IMAGE JOB STATUS => GET /api/images/{jobId}/status
    [HttpGet("{jobId}/status")]
    public async Task<IActionResult> GetImageJobStatus(string jobId)
    {
        try
        {
            var res = await imageGenService.GetJobStatus(jobId);
            return Ok(res);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ErrorRes { StatusCode = 404, Message = $"Image job {jobId} not found." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting image job status");
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while checking image job status." });
        }
    }
}
