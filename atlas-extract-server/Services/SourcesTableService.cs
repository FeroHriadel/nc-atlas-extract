using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class SourcesTableService(IAmazonDynamoDB dynamo) : ISourcesTableService
{
    // TABLE NAME
    private const string TableName = "nc-atlas-extract-sources";



    // CREATE SOURCE
    public async Task CreateSource(Source source)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            ["id"]           = new() { S = source.Id },
            ["friendlyName"] = new() { S = source.FriendlyName },
            ["title"]        = new() { S = source.Title },
            ["author"]       = new() { S = source.Author },
            ["description"]  = new() { S = source.Description },
            ["type"]         = new() { S = source.Type },
            ["url"]          = new() { S = source.Url },
            ["ISBN"]         = new() { S = source.ISBN },
            ["objectKey"]    = new() { S = source.ObjectKey },
            ["createdBy"]    = new() { S = source.CreatedBy },
            ["createdAt"]    = new() { S = source.CreatedAt.ToString("o") },
            ["updatedAt"]    = new() { S = source.UpdatedAt.ToString("o") },
        };

        await dynamo.PutItemAsync(new PutItemRequest { TableName = TableName, Item = item }); // throws if error occurs
    }



    // GET ALL SOURCES
    public async Task<List<Source>> GetSources()
    {
        var response = await dynamo.ScanAsync(new ScanRequest { TableName = TableName });
        return [.. response.Items.Select(MapToSource)];
    }



    // GET SURCE BY ID
    public async Task<Source> GetSourceById(string id)
    {
        var response = await dynamo.GetItemAsync(new GetItemRequest
        {
            TableName = TableName,
            Key = new Dictionary<string, AttributeValue> { ["id"] = new() { S = id } }
        });

        if (!response.IsItemSet) throw new KeyNotFoundException($"Source {id} not found");

        return MapToSource(response.Item);
    }



    // MAPPING FROM DYNAMODB ITEM TO SOURCE DTO
    private static Source MapToSource(Dictionary<string, AttributeValue> item) => new()
    {
        Id           = item["id"].S,
        FriendlyName = item["friendlyName"].S,
        Title        = item["title"].S,
        Author       = item.GetValueOrDefault("author")?.S ?? "Unknown",
        Description  = item.GetValueOrDefault("description")?.S ?? "",
        Type         = item.GetValueOrDefault("type")?.S ?? "Guide",
        Url          = item.GetValueOrDefault("url")?.S ?? "",
        ISBN         = item.GetValueOrDefault("ISBN")?.S ?? "",
        ObjectKey    = item["objectKey"].S,
        CreatedBy    = item["createdBy"].S,
        CreatedAt    = DateTime.Parse(item["createdAt"].S),
        UpdatedAt    = DateTime.Parse(item["updatedAt"].S),
    };
}