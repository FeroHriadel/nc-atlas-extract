using Amazon.DynamoDBv2;
using Amazon.S3;
using App.Dtos;
using App.Interfaces;
using App.Middleware;
using App.Services;
using Microsoft.AspNetCore.Mvc;



namespace App.Extensions;


public static class AppServiceExtensions
{
    public static IServiceCollection AddAppServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAWSService<IAmazonS3>(); // AWSService gets credentials from ~/.aws/credentials locally, IAM role in production
        services.AddAWSService<IAmazonDynamoDB>();
        services.AddScoped<IS3Service, S3Service>();
        services.AddScoped<ISourcesTableService, SourcesTableService>();
        services.AddScoped<IRequestCheckService, RequestCheckService>();
        services.AddScoped<IExtractionService, ExtractService>();
        services.AddControllers() // so it responds with camelCase json instead of PascalCase
            .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
        services.Configure<ApiBehaviorOptions>(options => // respond with {error: string} on model validation errors
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return new BadRequestObjectResult(new ErrorRes { StatusCode = 400, Message = string.Join(", ", errors) });
            };
        });
        services.AddCors();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        services.AddScoped<OnActionExecutionMiddleware>();
        return services;
    }
}
