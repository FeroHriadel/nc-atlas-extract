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


    // DELETE S3 OBJECT BY KEY
    public async Task DeleteSource(string objectKey)
    {
        var request = new DeleteObjectRequest
        {
            BucketName = BucketName,
            Key = objectKey
        };
        await s3.DeleteObjectAsync(request);
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



    // GENERATE PRESIGNED URL FOR A SINGLE UPLOAD PART
    public Task<string> GetPresignedUploadUrl(string uploadId, string objectKey, int partNumber)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = BucketName,
            Key = objectKey,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddMinutes(10),
            UploadId = uploadId,
            PartNumber = partNumber
        };
        return Task.FromResult(s3.GetPreSignedURL(request));
    }



    // COMPLETE MULTIPART UPLOAD — ASSEMBLES ALL PARTS INTO FINAL S3 OBJECT
    public async Task CompleteMultipartUpload(string uploadId, string objectKey, List<UploadPartDto> parts)
    {
        var request = new CompleteMultipartUploadRequest
        {
            BucketName = BucketName,
            Key = objectKey,
            UploadId = uploadId,
            PartETags = [.. parts.Select(p => new PartETag(p.PartNumber, p.ETag))]
        };
        await s3.CompleteMultipartUploadAsync(request);
    }



    // ABORT MULTIPART UPLOAD — DISCARDS ALL UPLOADED PARTS AND FREES S3 STORAGE
    public async Task AbortMultipartUpload(string uploadId, string objectKey)
    {
        var request = new AbortMultipartUploadRequest
        {
            BucketName = BucketName,
            Key = objectKey,
            UploadId = uploadId
        };
        await s3.AbortMultipartUploadAsync(request);
    }


    // GENERATE PRESIGNED URL FOR DOWNLOADING AN OBJECT
    public Task<string> GetPresignedDownloadUrl(string objectKey)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = BucketName,
            Key = objectKey,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(60)
        };
        return Task.FromResult(s3.GetPreSignedURL(request));
    }
}
