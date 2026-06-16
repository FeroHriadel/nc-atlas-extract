namespace App.Interfaces;



public interface IEnrichmentQueueService
{
    Task SendMessagesAsync(IEnumerable<string> messageBodies);
}
