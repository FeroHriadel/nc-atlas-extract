namespace App.Interfaces;



public interface IQueueService
{
    Task SendBatchMessagesAsync(IEnumerable<string> messageBodies);
}
