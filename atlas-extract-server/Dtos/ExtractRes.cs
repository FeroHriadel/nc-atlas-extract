namespace App.Dtos;



public class ExtractRes
{
    public required ExtractedItem[] Summary { get; set; }
    public string Error { get; set; }
    public string Message { get; set; }

}