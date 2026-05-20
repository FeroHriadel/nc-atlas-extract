using Microsoft.AspNetCore.Mvc.Filters;



namespace App.Middleware;



public class OnActionExecutionMiddleware : IAsyncActionFilter
{
  public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
  {
    // in development, log what's coming in
    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<OnActionExecutionMiddleware>>();
    var env = context.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
    if (env.IsDevelopment())
    {
      var request = context.HttpContext.Request;
      request.EnableBuffering();

      var body = string.Empty;
      if (request.ContentLength > 0)
      {
        using var reader = new StreamReader(request.Body, leaveOpen: true);
        body = await reader.ReadToEndAsync();
        request.Body.Position = 0;
      }

      logger.LogInformation("Incoming request: {method} {path} {body}", request.Method, request.Path, body);
    }

    await next();
  }
}