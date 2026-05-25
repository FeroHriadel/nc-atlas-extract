using Amazon.S3;
using Amazon.S3.Model;
using App.Dtos;
using App.Interfaces;



namespace App.Services;



public class S3Service(IAmazonS3 s3) : IS3Service
{
    private const string BucketName = "nc-atlas-extract-sources";
    private const string SourcesPrefix = "sources/";


    // LIST S3 OBJECT KEYS UNDER "sources/" PREFIX
    public async Task<List<string>> ListSources()
    {
        var request = new ListObjectsV2Request
        {
            BucketName = BucketName,
            Prefix = SourcesPrefix
        };

        var response = await s3.ListObjectsV2Async(request);

        return [.. (response.S3Objects ?? []).Select(o => o.Key)];
    }



    // INITIATE MULTIPART UPLOAD AND RETURN UPLOAD ID + OBJECT KEY
    public async Task<InitMultipartUploadRes> InitMultipartUpload(string fileName, string contentType)
    {
        var objectKey = $"{SourcesPrefix}{Guid.NewGuid()}_{fileName}";

        var request = new InitiateMultipartUploadRequest
        {
            BucketName = BucketName,
            Key = objectKey,
            ContentType = contentType
        };

        var response = await s3.InitiateMultipartUploadAsync(request);

        return new InitMultipartUploadRes
        {
            UploadId = response.UploadId,
            ObjectKey = objectKey
        };
    }
}
