using Microsoft.AspNetCore.Mvc;



namespace App.Controllers;



public class HealthController : BaseAppController
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { status = "Healthy" });
    }
}