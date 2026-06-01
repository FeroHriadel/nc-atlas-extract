using Amazon.SQS;
using Amazon.SQS.Model;
using App.Interfaces;



namespace App.Services;



public class QueueService(IAmazonSQS sqs, IConfiguration config) : IQueueService
{
    private readonly string QueueUrl = config["SQS:QueueUrl"] ?? throw new InvalidOperationException("SQS:QueueUrl is not configured.");

    public async Task SendBatchMessagesAsync(IEnumerable<string> messageBodies)
    {
        foreach (var chunk in messageBodies.Chunk(10))
        {
            var request = new SendMessageBatchRequest
            {
                QueueUrl = QueueUrl,
                Entries = chunk.Select((body, i) => new SendMessageBatchRequestEntry
                {
                    Id = i.ToString(),
                    MessageBody = body
                }).ToList()
            };
            await sqs.SendMessageBatchAsync(request);
        }
    }
}
