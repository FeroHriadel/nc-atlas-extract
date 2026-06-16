namespace App.Dtos;



public class Enrichment
{
    public required string ExtractionId { get; set; }
    public required bool GpsEnabled { get; set; }
    public required bool ImagesEnabled { get; set; }
    public string? Country { get; set; }
    public required int TotalItems { get; set; }
    public required int CompletedItems { get; set; }
    public required int FailedItems { get; set; }
    public required string Status { get; set; } // "pending" | "processing" | "completed" | "failed"
    public required DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public EnrichmentItem[] Items { get; set; } = [];
}


public class EnrichmentItem
{
    public required string Title { get; set; }
    public required string Status { get; set; } // "pending" | "processing" | "completed" | "failed"
    public string? ErrorMessage { get; set; }
    public string? S3Folder { get; set; } // where the enriched item.json/350.png/1024.png are saved
}
