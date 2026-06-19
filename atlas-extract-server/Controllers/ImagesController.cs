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
    // CREATE IMAGE => POST /api/images/create
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
            var res = await imageGenService.GenerateImage(req);
            return Ok(res);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during image generation");
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "An error occurred while generating the image." });
        }
    }
}
