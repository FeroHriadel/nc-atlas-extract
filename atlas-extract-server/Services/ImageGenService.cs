using System.Text.Json;
using Amazon.Lambda;
using Amazon.Lambda.Model;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class ImageGenService(
    IAmazonLambda lambdaClient,
    IImageJobsTableService imageJobsTableService,
    IS3Service s3Service,
    IConfiguration configuration
) : IImageGenService
{
    private readonly string functionName = configuration["Lambda:ImageGenFunctionName"]
        ?? throw new InvalidOperationException("Lambda:ImageGenFunctionName is not configured.");

    public async Task<string> StartImageGeneration(CreateImageReq req)
    {
        var jobId = Guid.NewGuid().ToString();

        await imageJobsTableService.PutImageJobAsync(new ImageJob
        {
            JobId = jobId,
            Status = "processing",
            CreatedAt = DateTime.UtcNow,
        });

        var payload = JsonSerializer.Serialize(new
        {
            jobId,
            title = req.Title,
            description = req.Description,
            category = req.Category,
            tags = req.Tags,
        });

        // Fire-and-forget — the lambda updates the job record itself when it finishes.
        // This keeps the HTTP response fast so CloudFront's origin timeout never comes into play.
        await lambdaClient.InvokeAsync(new InvokeRequest
        {
            FunctionName = functionName,
            InvocationType = InvocationType.Event,
            Payload = payload,
        });

        return jobId;
    }

    public async Task<ImageJobStatusRes> GetJobStatus(string jobId)
    {
        var job = await imageJobsTableService.GetImageJobAsync(jobId)
            ?? throw new KeyNotFoundException($"Image job {jobId} not found.");

        if (job.Status != "completed")
        {
            return new ImageJobStatusRes { Status = job.Status, ErrorMessage = job.ErrorMessage };
        }

        var image1024Url = await s3Service.GetPresignedDownloadUrl(job.Image1024Key!);
        var image350Url = await s3Service.GetPresignedDownloadUrl(job.Image350Key!);

        return new ImageJobStatusRes
        {
            Status = job.Status,
            Image1024Url = image1024Url,
            Image350Url = image350Url,
        };
    }
}
