namespace App.Dtos;

public class EnrichedItemRes
{
    public required string Title { get; set; }
    public required string Status { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string[]? Tags { get; set; }
    public EnrichedItemLocation? Location { get; set; }
    public string? Image350Url { get; set; }
    public string? Image1024Url { get; set; }
}

public class EnrichedItemLocation
{
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? County { get; set; }
    public double[]? Coordinates { get; set; }
}

internal class StoredEnrichedItem
{
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string[]? Tags { get; set; }
    public EnrichedItemLocation? Location { get; set; }
    public string? Image1024 { get; set; }
    public string? Image350 { get; set; }
}
