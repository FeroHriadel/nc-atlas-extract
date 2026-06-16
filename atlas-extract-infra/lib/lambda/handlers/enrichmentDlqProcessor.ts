import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';



const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ENRICHMENTS_TABLE = process.env.ENRICHMENTS_TABLE_NAME!;



export async function handler(event: SQSEvent): Promise<void> {
    const body = JSON.parse(event.Records[0].body) as { extractionId: string; itemIndex: number };
    const { extractionId, itemIndex } = body;

    console.log(`DLQ: marking item ${itemIndex} of extraction ${extractionId} as failed`);

    const { Attributes: updated } = await dynamo.send(new UpdateCommand({
        TableName: ENRICHMENTS_TABLE,
        Key: { extractionId },
        UpdateExpression: `SET #items[${itemIndex}].#s = :failed, #items[${itemIndex}].errorMessage = :err ADD failedItems :one`,
        ExpressionAttributeNames: { '#items': 'items', '#s': 'status' },
        ExpressionAttributeValues: {
            ':failed': 'failed',
            ':err': 'Processing failed after max retries',
            ':one': 1,
        },
        ReturnValues: 'ALL_NEW',
    }));

    if ((updated!.completedItems as number) + (updated!.failedItems as number) >= (updated!.totalItems as number)) {
        await dynamo.send(new UpdateCommand({
            TableName: ENRICHMENTS_TABLE,
            Key: { extractionId },
            UpdateExpression: 'SET #s = :completed, completedAt = :now',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':completed': 'completed', ':now': new Date().toISOString() },
        }));
    }
}
