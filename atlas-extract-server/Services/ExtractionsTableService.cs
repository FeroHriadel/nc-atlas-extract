using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class ExtractionsTableService(IAmazonDynamoDB dynamo, IConfiguration config) : IExtractionsTableService
{
    private readonly string TableName = config["DynamoDB:ExtractionsTableName"] ?? throw new InvalidOperationException("DynamoDB:ExtractionsTableName is not configured.");



    public async Task CreateExtractionAsync(Extraction extraction)
    {
        await dynamo.PutItemAsync(new PutItemRequest
        {
            TableName = TableName,
            Item = ToItem(extraction)
        });
    }



    public async Task<Extraction> GetExtractionAsync(string id)
    {
        var response = await dynamo.GetItemAsync(new GetItemRequest
        {
            TableName = TableName,
            Key = new Dictionary<string, AttributeValue> { ["id"] = new() { S = id } }
        });

        if (!response.IsItemSet) throw new KeyNotFoundException($"Extraction {id} not found");

        return MapToExtraction(response.Item);
    }



    private static Dictionary<string, AttributeValue> ToItem(Extraction e) => new()
    {
        ["id"]                   = new() { S = e.Id },
        ["sourceId"]             = new() { S = e.SourceId },
        ["friendlyName"]         = new() { S = e.FriendlyName },
        ["sourceLanguage"]       = new() { S = e.SourceLanguage },
        ["sourceTopic"]          = new() { S = e.SourceTopic },
        ["structureDescription"] = new() { S = e.StructureDescription },
        ["ignore"]               = new() { S = e.Ignore },
        ["descriptionLength"]    = new() { S = e.DescriptionLength },
        ["additionalInstructions"] = new() { S = e.AdditionalInstructions },
        ["sourceS3Key"]          = new() { S = e.SourceS3Key },
        ["totalBatches"]         = new() { N = e.TotalBatches.ToString() },
        ["completedBatches"]     = new() { N = e.CompletedBatches.ToString() },
        ["failedBatches"]        = new() { N = e.FailedBatches.ToString() },
        ["status"]               = new() { S = e.Status },
        ["createdAt"]            = new() { S = e.CreatedAt.ToString("o") },
        ["completedAt"]          = e.CompletedAt.HasValue
                                       ? new() { S = e.CompletedAt.Value.ToString("o") }
                                       : new() { NULL = true },
        ["pages"]    = new() { L = [.. e.Pages.Select(PageToAttr)] },
        ["batches"]  = new() { L = [.. e.Batches.Select(BatchToAttr)] },
    };

    private static AttributeValue PageToAttr(PageRange p) => new()
    {
        M = new()
        {
            ["startPage"] = new() { N = p.StartPage.ToString() },
            ["endPage"]   = new() { N = p.EndPage.ToString() },
        }
    };

    private static AttributeValue BatchToAttr(BatchStatus b)
    {
        var m = new Dictionary<string, AttributeValue>
        {
            ["startPage"] = new() { N = b.StartPage.ToString() },
            ["endPage"]   = new() { N = b.EndPage.ToString() },
            ["status"]    = new() { S = b.Status },
        };
        if (b.ErrorMessage != null) m["errorMessage"] = new() { S = b.ErrorMessage };
        if (b.S3ResultKey != null)  m["s3ResultKey"]  = new() { S = b.S3ResultKey };
        return new() { M = m };
    }

    private static Extraction MapToExtraction(Dictionary<string, AttributeValue> item) => new()
    {
        Id                   = item["id"].S,
        FriendlyName         = item["friendlyName"].S,
        SourceId             = item["sourceId"].S,
        SourceLanguage       = item["sourceLanguage"].S,
        SourceTopic          = item["sourceTopic"].S,
        StructureDescription = item["structureDescription"].S,
        Ignore               = item.GetValueOrDefault("ignore")?.S ?? "",
        DescriptionLength    = item["descriptionLength"].S,
        AdditionalInstructions = item.GetValueOrDefault("additionalInstructions")?.S ?? "",
        SourceS3Key          = item["sourceS3Key"].S,
        TotalBatches         = int.Parse(item["totalBatches"].N),
        CompletedBatches     = int.Parse(item["completedBatches"].N),
        FailedBatches        = int.Parse(item["failedBatches"].N),
        Status               = item["status"].S,
        CreatedAt            = DateTime.Parse(item["createdAt"].S),
        CompletedAt          = item.TryGetValue("completedAt", out var ca) && ca.NULL != true
                                   ? DateTime.Parse(ca.S)
                                   : null,
        Pages   = [.. item["pages"].L.Select(a => new PageRange
        {
            StartPage = int.Parse(a.M["startPage"].N),
            EndPage   = int.Parse(a.M["endPage"].N),
        })],
        Batches = [.. item["batches"].L.Select(a => new BatchStatus
        {
            StartPage    = int.Parse(a.M["startPage"].N),
            EndPage      = int.Parse(a.M["endPage"].N),
            Status       = a.M["status"].S,
            ErrorMessage = a.M.TryGetValue("errorMessage", out var em) ? em.S : null,
            S3ResultKey  = a.M.TryGetValue("s3ResultKey",  out var sk) ? sk.S : null,
        })],
    };
}
