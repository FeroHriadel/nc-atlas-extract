using App.Dtos;



namespace App.Interfaces;



public interface IImageJobsTableService
{
    Task<ImageJob?> GetImageJobAsync(string jobId);
    Task PutImageJobAsync(ImageJob job);
}
