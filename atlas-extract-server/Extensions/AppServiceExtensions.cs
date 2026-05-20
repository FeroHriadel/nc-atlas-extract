using Amazon.S3;
using App.Interfaces;
using App.Middleware;
using App.Services;



namespace App.Extensions;


public static class AppServiceExtensions
{
    public static IServiceCollection AddAppServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAWSService<IAmazonS3>(); // AWSService gets credentials from ~/.aws/credentials locally, IAM role in production
        services.AddScoped<IS3Service, S3Service>();
        services.AddControllers();
        services.AddCors();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        services.AddScoped<OnActionExecutionMiddleware>();
        return services;
    }
}
