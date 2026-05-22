namespace App.Dtos;



public class SourceCreateReq
{
    public required string FriendlyName { get; set; }
    public required string Title { get; set; }
    public string Author { get; set; } = "";
    public string Description { get; set; } = "";
    public string Type { get; set; } = "guide";
    public string Url { get; set; } = "";
    public string ISBN { get; set; } = "";
    public required string ObjectKey { get; set; }
}