namespace App.Dtos;



public class ExtractionBatchUrlRes
{
    public int BatchIndex { get; set; }
    public int StartPage { get; set; }
    public int EndPage { get; set; }
    public string Url { get; set; } = "";
}

public class ExtractionJsonRes
{
    public string ExtractionId { get; set; } = "";
    public List<ExtractionBatchUrlRes> Batches { get; set; } = [];
}
