using App.Dtos;

namespace App.Interfaces;

public interface IS3Service
{
    Task<List<string>> ListSources();
    Task<InitMultipartUploadRes> InitMultipartUpload(string fileName, string contentType);
}
