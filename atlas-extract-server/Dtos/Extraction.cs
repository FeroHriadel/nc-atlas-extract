namespace App.Dtos;



public class Extraction
{
    public required string Id { get; set; }
    public required PageRange[] Pages { get; set; }
    public required string SourceId { get; set; }
    public required string SourceLanguage { get; set; }
    public required string SourceTopic { get; set; }
    public required string StructureDescription { get; set; }
    public string Ignore { get; set; } = "";
    public required string DescriptionLength { get; set; }
    public string AdditionalInstructions { get; set; } = "";
    public required string SourceS3Key { get; set; } // where the original document is stored
    public required int TotalBatches { get; set; }
    public required int CompletedBatches { get; set; }
    public required int FailedBatches { get; set; }
    public required string Status { get; set; } // "pending" | "processing" | "completed" | "failed"
    public required DateTime CreatedAt { get; set; }
    public required DateTime? CompletedAt { get; set; }
    public BatchStatus[] Batches { get; set; } = [];
}


public class PageRange
{
    public required int StartPage { get; set; }
    public required int EndPage { get; set; }
}


public class BatchStatus
{
    public required int StartPage { get; set; }
    public required int EndPage { get; set; }
    public required string Status { get; set; } // "pending" | "processing" | "completed" | "failed"
    public string? ErrorMessage { get; set; }
    public string? S3ResultKey { get; set; } // where the ExtractedItems for this batch are saved
}