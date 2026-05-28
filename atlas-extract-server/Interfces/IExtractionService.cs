using App.Dtos;

namespace App.Interfaces;



public interface IExtractionService
{
    Task<ExtractRes> Extract(ExtractReq req);
}