namespace App.Dtos;



public class CreateImageReq
{
    public required string Title { get; set; }
    public required string Description { get; set; }
    public required string Category { get; set; }
    public string[] Tags { get; set; } = [];
}
