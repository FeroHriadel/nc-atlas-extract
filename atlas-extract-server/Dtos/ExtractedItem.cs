namespace App.Dtos;



public class ExtractedItem
{
    public required string Title { get; set; }
    public required string Description { get; set; }
    public required string Category { get; set; }
    public required string[] Tags { get; set; }
}