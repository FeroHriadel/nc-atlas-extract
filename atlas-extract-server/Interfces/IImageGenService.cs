using App.Dtos;

namespace App.Interfaces;



public interface IImageGenService
{
    Task<string> StartImageGeneration(CreateImageReq req);
    Task<ImageJobStatusRes> GetJobStatus(string jobId);
}
