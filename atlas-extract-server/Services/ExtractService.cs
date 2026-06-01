using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class ExtractService(IConfiguration configuration) : IExtractionService
{

    private readonly string apiKey = configuration["Anthropic:ApiKey"]
        ?? throw new InvalidOperationException("Anthropic:ApiKey is not configured.");
    private readonly string generalInstructions = """
        YOUR ROLE:
        You are an assistant who summarizes info from text about sights and places of interest in a json.

        YOUR OUTPUT:
        The JSON should have the following format:
        {
            "summary": [
                 {
                    "title": string,
                    "description": string,
                    "category": string,
                    "tags": [string],
                },
                ...
            ],
            "error": string,
            "message": string
        }
        "description" - unless specified otherwise, the should be a concise summary of the most important information about the place - 1-3 sentences. Output is in English.
        "category" - a keyword that describes the nature of a place, e.g.: cemetery, town, settlement, mountain, reservoir, park, etc.
        "tags" - a list of keywords that provides more info about a place, e.g.: "WWII", "medieval", "nature", "hiking", "family-friendly", etc.
        "error" - if you can't complete the task, provide a brief explanation of the reason in this field. Otherwise, leave it empty.
        "message" - if you can't complete the task, provide a brief instruction on how to fix the issue in this field. Otherwise, leave it empty.

        DO'S:
        Always respond in a json format, and follow the structure described above. No additional text in the response. Always provide a "category" and at least one "tag".

        DONT'S:
        Never hallucinate. If unsure about a piece of info - skip.

    """;

    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };


    public async Task<ExtractRes> Extract(ExtractReq req)
    {
        var userPrompt = BuildPrompt(req);

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Add("x-api-key", apiKey);
        http.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var body = JsonSerializer.Serialize(new
        {
            model = "claude-sonnet-4-6",
            max_tokens = 4096,
            system = generalInstructions,
            messages = new[] { new { role = "user", content = userPrompt } }
        });

        var response = await http.PostAsync(
            "https://api.anthropic.com/v1/messages",
            new StringContent(body, Encoding.UTF8, "application/json")
        );
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        var anthropicRes = JsonSerializer.Deserialize<AnthropicResponse>(responseJson, _jsonOptions);
        var aiText = StripCodeFence(anthropicRes!.Content[0].Text);

        var result = JsonSerializer.Deserialize<ClaudeResult>(aiText, _jsonOptions);

        return new ExtractRes
        {
            Summary = result?.Summary?.Select(i => new ExtractedItem
            {
                Title = i.Title,
                Description = i.Description,
                Category = i.Category,
                Tags = i.Tags ?? []
            }).ToArray() ?? [],
            Error = result?.Error ?? string.Empty,
            Message = result?.Message ?? string.Empty
        };
    }

    private static string BuildPrompt(ExtractReq req)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"LANGUAGE: {req.SourceLanguage}");
        sb.AppendLine($"TOPIC: {req.SourceTopic}");
        sb.AppendLine($"DESCRIPTION LENGTH: {req.DescriptionLength}");
        sb.AppendLine($"STRUCTURE: {req.StructureDescription}");
        sb.AppendLine($"IGNORE: {req.Ignore}");
        if (!string.IsNullOrWhiteSpace(req.AdditionalInstructions))
            sb.AppendLine($"ADDITIONAL INSTRUCTIONS: {req.AdditionalInstructions}");
        sb.AppendLine();
        sb.AppendLine("TEXT:");
        sb.AppendLine(req.Text);
        return sb.ToString();
    }

    private static string StripCodeFence(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```"))
        {
            var start = trimmed.IndexOf('\n') + 1;
            var end = trimmed.LastIndexOf("```");
            return trimmed[start..end].Trim();
        }
        return trimmed;
    }

    private record AnthropicResponse(
        [property: JsonPropertyName("content")] AnthropicContent[] Content
    );

    private record AnthropicContent(
        [property: JsonPropertyName("text")] string Text
    );

    private record ClaudeResult(
        [property: JsonPropertyName("summary")] ClaudeItem[]? Summary,
        [property: JsonPropertyName("error")] string? Error,
        [property: JsonPropertyName("message")] string? Message
    );

    private record ClaudeItem(
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("description")] string Description,
        [property: JsonPropertyName("category")] string Category,
        [property: JsonPropertyName("tags")] string[]? Tags
    );
}
