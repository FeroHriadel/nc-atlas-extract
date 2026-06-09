using App.Dtos;



namespace App.Interfaces;



public interface IExtractionsTableService
{
    Task CreateExtractionAsync(Extraction extraction);
    Task<Extraction> GetExtractionAsync(string id);
    Task<Extraction[]> GetExtractionsAsync();
    Task DeleteExtractionAsync(string id);
}
