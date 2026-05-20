using Microsoft.AspNetCore.Mvc;
using App.Dtos;
using App.Interfaces;



namespace App.Controllers;



public class SourcesController(IS3Service s3Service) : BaseAppController
{
    [HttpGet]
    public async Task<IActionResult> GetSources()
    {
        try
        {
            var sources = await s3Service.ListSources() ?? [];
            return Ok(new SourcesResDto { Sources = sources });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResDto { StatusCode = 500, Message = ex.Message });
        }
    }
}