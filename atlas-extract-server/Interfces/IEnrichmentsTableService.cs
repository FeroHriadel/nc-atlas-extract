using App.Dtos;



namespace App.Interfaces;



public interface IEnrichmentsTableService
{
    Task<Enrichment?> GetEnrichmentAsync(string extractionId);
    Task<Enrichment[]> GetAllEnrichmentsAsync();
    Task PutEnrichmentAsync(Enrichment enrichment);
    Task DeleteEnrichmentAsync(string extractionId);
}
