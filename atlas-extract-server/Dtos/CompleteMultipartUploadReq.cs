namespace App.Dtos;



public class UploadPartDto
{
    public required int PartNumber { get; set; }
    public required string ETag { get; set; }
}



public class CompleteMultipartUploadReq
{
    public required string UploadId { get; set; }
    public required string ObjectKey { get; set; }
    public required List<UploadPartDto> Parts { get; set; }
}
