using App.Dtos;

namespace App.Interfaces;



public interface IImageGenService
{
    Task<CreateImageRes> GenerateImage(CreateImageReq req);
}
