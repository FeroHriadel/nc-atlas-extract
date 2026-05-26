using App.Dtos;



namespace App.Interfaces;


public interface ISourcesTableService
{
    Task CreateSource(Source source);
    Task<List<Source>> GetSources();
    Task UpdateSource(Source source);
    Task DeleteSource(string id);
    Task<Source> GetSourceById(string id);

}