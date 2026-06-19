using System.Text;
using System.Text.Json;
using Amazon.Lambda;
using Amazon.Lambda.Model;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class ImageGenService(IAmazonLambda lambdaClient, IConfiguration configuration) : IImageGenService
{
    private readonly string functionName = configuration["Lambda:ImageGenFunctionName"]
        ?? throw new InvalidOperationException("Lambda:ImageGenFunctionName is not configured.");

    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<CreateImageRes> GenerateImage(CreateImageReq req)
    {
        var payload = JsonSerializer.Serialize(new
        {
            title = req.Title,
            description = req.Description,
            category = req.Category,
            tags = req.Tags,
        });

        var response = await lambdaClient.InvokeAsync(new InvokeRequest
        {
            FunctionName = functionName,
            InvocationType = InvocationType.RequestResponse,
            Payload = payload,
        });

        using var reader = new StreamReader(response.Payload);
        var responseBody = await reader.ReadToEndAsync();

        if (!string.IsNullOrEmpty(response.FunctionError))
            throw new InvalidOperationException($"Image generation lambda failed: {responseBody}");

        var result = JsonSerializer.Deserialize<LambdaImageRes>(responseBody, _jsonOptions)
            ?? throw new InvalidOperationException("Image generation lambda returned an empty response.");

        return new CreateImageRes { Image = result.Image };
    }

    private record LambdaImageRes(string Image);
}
