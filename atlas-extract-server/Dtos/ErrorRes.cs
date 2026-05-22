namespace App.Dtos;

public class ErrorRes
{
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
}