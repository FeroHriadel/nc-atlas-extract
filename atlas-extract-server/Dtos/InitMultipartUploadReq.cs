namespace App.Dtos;



public class InitMultipartUploadReq
{
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
}
