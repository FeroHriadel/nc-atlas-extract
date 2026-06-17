namespace App.Dtos;



public class StatsRes
{
    public List<DailyStats> ThisMonth { get; set; } = [];
    public OverallStats Overall { get; set; } = new();
}

public class DailyStats
{
    public string Date { get; set; } = "";
    public int ExtractedItems { get; set; }
    public int ImagesGenerated { get; set; }
    public int FailedExtractions { get; set; }
    public int FailedEnrichments { get; set; }
}

public class OverallStats
{
    public int ExtractedItems { get; set; }
    public int ImagesGenerated { get; set; }
    public int FailedExtractions { get; set; }
    public int FailedEnrichments { get; set; }
}
