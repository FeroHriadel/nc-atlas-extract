namespace App.Dtos;


public class Source
{
    public required string Id { get; set; }
    public required string FriendlyName { get; set; }
    public required string Title { get; set; }
    public string Author { get; set; } = "";
    public string Description { get; set; } = "";
    public string Type { get; set; } = "guide";
    public string Url { get; set; } = "";
    public string ISBN { get; set; } = "";
    public required string ObjectKey { get; set; }
    public required string CreatedBy { get; set; }
    public required DateTime CreatedAt { get; set; }
    public required DateTime UpdatedAt { get; set; }
}