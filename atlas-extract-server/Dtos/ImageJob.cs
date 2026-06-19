namespace App.Dtos;



public class ImageJob
{
    public required string JobId { get; set; }
    public required string Status { get; set; } // "processing" | "completed" | "failed"
    public string? Image1024Key { get; set; }
    public string? Image350Key { get; set; }
    public string? ErrorMessage { get; set; }
    public required DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
