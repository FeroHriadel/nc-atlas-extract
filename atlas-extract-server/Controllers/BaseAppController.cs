using Microsoft.AspNetCore.Mvc;
using App.Middleware;



namespace App.Controllers;



[ServiceFilter(typeof(OnActionExecutionMiddleware))]
[ApiController]
[Route("api/[controller]")]
public class BaseAppController : ControllerBase
{
    // This class can be used to define common functionality for all API controllers
    // For example, you can add common methods, properties, or filters here that all API controllers will inherit.
}