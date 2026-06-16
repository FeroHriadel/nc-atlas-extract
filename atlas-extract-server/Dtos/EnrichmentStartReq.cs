namespace App.Dtos;



public class EnrichmentStartReq
{
    public bool GpsEnabled { get; set; }
    public bool ImagesEnabled { get; set; }
    public string? Country { get; set; }
}
