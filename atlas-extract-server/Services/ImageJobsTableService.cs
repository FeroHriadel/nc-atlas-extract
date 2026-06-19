using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class ImageJobsTableService(IAmazonDynamoDB dynamo, IConfiguration config) : IImageJobsTableService
{
    private readonly string TableName = config["DynamoDB:ImageJobsTableName"] ?? throw new InvalidOperationException("DynamoDB:ImageJobsTableName is not configured.");



    public async Task<ImageJob?> GetImageJobAsync(string jobId)
    {
        var response = await dynamo.GetItemAsync(new GetItemRequest
        {
            TableName = TableName,
            Key = new Dictionary<string, AttributeValue> { ["jobId"] = new() { S = jobId } }
        });

        return response.IsItemSet ? MapToImageJob(response.Item) : null;
    }



    public async Task PutImageJobAsync(ImageJob job)
    {
        await dynamo.PutItemAsync(new PutItemRequest
        {
            TableName = TableName,
            Item = ToItem(job)
        });
    }



    private static Dictionary<string, AttributeValue> ToItem(ImageJob j) => new()
    {
        ["jobId"]        = new() { S = j.JobId },
        ["status"]       = new() { S = j.Status },
        ["image1024Key"] = j.Image1024Key != null ? new() { S = j.Image1024Key } : new() { NULL = true },
        ["image350Key"]  = j.Image350Key != null ? new() { S = j.Image350Key } : new() { NULL = true },
        ["errorMessage"] = j.ErrorMessage != null ? new() { S = j.ErrorMessage } : new() { NULL = true },
        ["createdAt"]    = new() { S = j.CreatedAt.ToString("o") },
        ["completedAt"]  = j.CompletedAt.HasValue ? new() { S = j.CompletedAt.Value.ToString("o") } : new() { NULL = true },
    };

    private static ImageJob MapToImageJob(Dictionary<string, AttributeValue> item) => new()
    {
        JobId        = item["jobId"].S,
        Status       = item["status"].S,
        Image1024Key = item.TryGetValue("image1024Key", out var k1) && k1.NULL != true ? k1.S : null,
        Image350Key  = item.TryGetValue("image350Key", out var k3) && k3.NULL != true ? k3.S : null,
        ErrorMessage = item.TryGetValue("errorMessage", out var em) && em.NULL != true ? em.S : null,
        CreatedAt    = DateTime.Parse(item["createdAt"].S),
        CompletedAt  = item.TryGetValue("completedAt", out var ca) && ca.NULL != true ? DateTime.Parse(ca.S) : null,
    };
}
