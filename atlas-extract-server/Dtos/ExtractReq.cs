namespace App.Dtos;



public class ExtractReq
{
    public required string Text { get; set; }
    public required int StartPage { get; set; }
    public required int EndPage { get; set; }
    public required string SourceId { get; set; }
    public required string SourceLanguage { get; set; }
    public required string SourceTopic { get; set; }
    public required string StructureDescription { get; set; }
    public required string Ignore {get; set; }
    public required string DescriptionLength { get; set; }
    public string AdditionalInstructions { get; set; }
}