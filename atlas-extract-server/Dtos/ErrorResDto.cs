namespace App.Dtos;

public class ErrorResDto
{
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
}