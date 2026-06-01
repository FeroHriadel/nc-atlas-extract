namespace App.Dtos;



public class ExtractionStartReq
{
    public required string SourceId { get; set; }
    public required PageRange[] PageRanges { get; set; }
    public required string SourceLanguage { get; set; }
    public required string SourceTopic { get; set; }
    public required string StructureDescription { get; set; }
    public string Ignore { get; set; } = "";
    public required string DescriptionLength { get; set; }
    public string AdditionalInstructions { get; set; } = "";
}
