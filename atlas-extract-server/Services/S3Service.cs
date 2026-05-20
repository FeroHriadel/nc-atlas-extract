using Amazon.S3;
using Amazon.S3.Model;
using App.Interfaces;



namespace App.Services;



public class S3Service(IAmazonS3 s3) : IS3Service
{
    private const string BucketName = "nc-atlas-extract-sources";
    private const string SourcesPrefix = "sources/";

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
}
