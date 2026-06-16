using Amazon.SQS;
using Amazon.SQS.Model;
using App.Interfaces;



namespace App.Services;



public class EnrichmentQueueService(IAmazonSQS sqs, IConfiguration config) : IEnrichmentQueueService
{
    private readonly string QueueUrl = config["SQS:EnrichmentQueueUrl"] ?? throw new InvalidOperationException("SQS:EnrichmentQueueUrl is not configured.");

    public async Task SendMessagesAsync(IEnumerable<string> messageBodies)
    {
        foreach (var chunk in messageBodies.Chunk(10))
        {
            var request = new SendMessageBatchRequest
            {
                QueueUrl = QueueUrl,
                Entries = chunk.Select((body, i) => new SendMessageBatchRequestEntry
                {
                    Id          = i.ToString(),
                    MessageBody = body,
                }).ToList(),
            };
            await sqs.SendMessageBatchAsync(request);
        }
    }
}
