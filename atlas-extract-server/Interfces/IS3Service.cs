using App.Dtos;

namespace App.Interfaces;

public interface IS3Service
{
    Task<List<string>> ListSources();
    Task DeleteSource(string objectKey);
    Task<InitMultipartUploadRes> InitMultipartUpload(string fileName, string contentType);
    Task<string> GetPresignedUploadUrl(string uploadId, string objectKey, int partNumber);
    Task CompleteMultipartUpload(string uploadId, string objectKey, List<UploadPartDto> parts);
    Task AbortMultipartUpload(string uploadId, string objectKey);
}
