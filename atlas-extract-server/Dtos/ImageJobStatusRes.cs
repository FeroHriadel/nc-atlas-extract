namespace App.Dtos;



public class ImageJobStatusRes
{
    public required string Status { get; set; } // "processing" | "completed" | "failed"
    public string? Image1024Url { get; set; }
    public string? Image350Url { get; set; }
    public string? ErrorMessage { get; set; }
}
