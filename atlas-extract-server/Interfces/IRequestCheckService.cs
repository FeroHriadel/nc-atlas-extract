using App.Dtos;

namespace App.Interfaces;



public interface IRequestCheckService
{
    List<string> CheckRequest(object payload, RequiredField[] requiredFields);
}