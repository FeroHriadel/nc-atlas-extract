using App.Dtos;



namespace App.Interfaces;


public interface ISourcesTableService
{
    Task CreateSource(Source source);
    Task<List<Source>> GetSources();
    Task<Source> GetSourceById(string id);

}