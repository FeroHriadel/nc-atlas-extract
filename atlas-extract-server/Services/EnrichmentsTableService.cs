using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class EnrichmentsTableService(IAmazonDynamoDB dynamo, IConfiguration config) : IEnrichmentsTableService
{
    private readonly string TableName = config["DynamoDB:EnrichmentsTableName"] ?? throw new InvalidOperationException("DynamoDB:EnrichmentsTableName is not configured.");



    public async Task<Enrichment?> GetEnrichmentAsync(string extractionId)
    {
        var response = await dynamo.GetItemAsync(new GetItemRequest
        {
            TableName = TableName,
            Key = new Dictionary<string, AttributeValue> { ["extractionId"] = new() { S = extractionId } }
        });

        return response.IsItemSet ? MapToEnrichment(response.Item) : null;
    }



    public async Task<Enrichment[]> GetAllEnrichmentsAsync()
    {
        var response = await dynamo.ScanAsync(new ScanRequest { TableName = TableName });
        if (response.Items == null || response.Items.Count == 0) return [];
        return [.. response.Items.Select(MapToEnrichment)];
    }



    public async Task PutEnrichmentAsync(Enrichment enrichment)
    {
        await dynamo.PutItemAsync(new PutItemRequest
        {
            TableName = TableName,
            Item = ToItem(enrichment)
        });
    }



    public async Task DeleteEnrichmentAsync(string extractionId)
    {
        await dynamo.DeleteItemAsync(new DeleteItemRequest
        {
            TableName = TableName,
            Key = new Dictionary<string, AttributeValue> { ["extractionId"] = new() { S = extractionId } }
        });
    }



    private static Dictionary<string, AttributeValue> ToItem(Enrichment e) => new()
    {
        ["extractionId"]   = new() { S = e.ExtractionId },
        ["gpsEnabled"]     = new() { BOOL = e.GpsEnabled },
        ["imagesEnabled"]  = new() { BOOL = e.ImagesEnabled },
        ["country"]        = e.Country != null ? new() { S = e.Country } : new() { NULL = true },
        ["totalItems"]     = new() { N = e.TotalItems.ToString() },
        ["completedItems"] = new() { N = e.CompletedItems.ToString() },
        ["failedItems"]    = new() { N = e.FailedItems.ToString() },
        ["status"]         = new() { S = e.Status },
        ["startedAt"]      = new() { S = e.StartedAt.ToString("o") },
        ["completedAt"]    = e.CompletedAt.HasValue
                                 ? new() { S = e.CompletedAt.Value.ToString("o") }
                                 : new() { NULL = true },
        ["items"]          = new() { L = [.. e.Items.Select(ItemToAttr)] },
    };

    private static AttributeValue ItemToAttr(EnrichmentItem i)
    {
        var m = new Dictionary<string, AttributeValue>
        {
            ["title"]  = new() { S = i.Title },
            ["status"] = new() { S = i.Status },
        };
        if (i.ErrorMessage != null) m["errorMessage"] = new() { S = i.ErrorMessage };
        if (i.S3Folder != null)     m["s3Folder"]     = new() { S = i.S3Folder };
        return new() { M = m };
    }

    private static Enrichment MapToEnrichment(Dictionary<string, AttributeValue> item) => new()
    {
        ExtractionId   = item["extractionId"].S,
        GpsEnabled     = item["gpsEnabled"].BOOL ?? false,
        ImagesEnabled  = item["imagesEnabled"].BOOL ?? false,
        Country        = item.TryGetValue("country", out var c) && c.NULL != true ? c.S : null,
        TotalItems     = int.Parse(item["totalItems"].N),
        CompletedItems = int.Parse(item["completedItems"].N),
        FailedItems    = int.Parse(item["failedItems"].N),
        Status         = item["status"].S,
        StartedAt      = DateTime.Parse(item["startedAt"].S),
        CompletedAt    = item.TryGetValue("completedAt", out var ca) && ca.NULL != true
                             ? DateTime.Parse(ca.S)
                             : null,
        Items = [.. item["items"].L.Select(a => new EnrichmentItem
        {
            Title        = a.M["title"].S,
            Status       = a.M["status"].S,
            ErrorMessage = a.M.TryGetValue("errorMessage", out var em) ? em.S : null,
            S3Folder     = a.M.TryGetValue("s3Folder", out var sf) ? sf.S : null,
        })],
    };
}
