import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';



const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const secretsClient = new SecretsManagerClient({});

const TABLE_NAME = process.env.EXTRACTIONS_TABLE_NAME!;
const BUCKET_NAME = process.env.SOURCES_BUCKET_NAME!;

let cachedAnthropicApiKey: string | undefined;

async function getAnthropicApiKey(): Promise<string> {
    if (cachedAnthropicApiKey) return cachedAnthropicApiKey;
    if (process.env.ANTHROPIC_API_KEY) {
        cachedAnthropicApiKey = process.env.ANTHROPIC_API_KEY;
        return cachedAnthropicApiKey;
    }
    const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: process.env.API_KEYS_SECRET_ARN! }));
    cachedAnthropicApiKey = JSON.parse(res.SecretString!).ANTHROPIC_API_KEY;
    return cachedAnthropicApiKey!;
}

const GENERAL_INSTRUCTIONS = `
    YOUR ROLE:
    You are an assistant who summarizes info from text about sights and places of interest in a json.

    YOUR OUTPUT:
    The JSON should have the following format:
    {
        "summary": [
             {
                "title": string,
                "description": string,
                "category": string,
                "tags": [string],
            },
            ...
        ],
        "error": string,
        "message": string
    }
    "title" - may use other than English name.
    "description" - unless specified otherwise, the should be a concise summary of the most important information about the place - 1-3 sentences. Output is in English.
    "category" - a keyword that describes the nature of a place, e.g.: cemetery, town, settlement, mountain, reservoir, park, etc.
    "tags" - a list of keywords that provides more info about a place, e.g.: "WWII", "medieval", "nature", "hiking", "family-friendly", etc.
    "error" - if you can't complete the task, provide a brief explanation of the reason in this field. Otherwise, leave it empty.
    "message" - if you can't complete the task, provide a brief instruction on how to fix the issue in this field. Otherwise, leave it empty.

    DO'S:
    Always respond in a json format, and follow the structure described above. No additional text in the response. Always provide a "category" and at least one "tag". No more than 3 tags.
    Summary.description must be in English, regardless of the input language.
    Summary.category must be in English, regardless of the input language.
    Summary.tags must be in English, regardless of the input language.

    DONT'S:
    Never hallucinate. If unsure about a piece of info - skip.
    Don't respond in language other than English.
`.trim();



interface SqsMessageBody {
    extractionId: string;
    batchIndex: number;
    text: string;
}

interface ExtractionSettings {
    sourceLanguage: string;
    sourceTopic: string;
    structureDescription: string;
    ignore: string;
    descriptionLength: string;
    additionalInstructions: string;
}

interface ClaudeResult {
    summary: { title: string; description: string; category: string; tags: string[] }[];
    error: string;
    message: string;
}



export async function handler(event: SQSEvent): Promise<void> {
    const { extractionId, batchIndex, text }: SqsMessageBody = JSON.parse(event.Records[0].body);

    // get extraction record for settings + totalBatches
    const { Item: extraction } = await dynamo.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: extractionId },
    }));
    if (!extraction) throw new Error(`Extraction ${extractionId} not found in DynamoDB`);

    // idempotency guard — skip if this batch already completed (e.g. SQS duplicate delivery)
    if (extraction.batches?.[batchIndex]?.status === 'completed') {
        console.log(`Batch ${batchIndex} of extraction ${extractionId} already completed — skipping`);
        return;
    }

    // mark batch as processing
    await dynamo.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: extractionId },
        UpdateExpression: `SET batches[${batchIndex}].#s = :processing`,
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':processing': 'processing' },
    }));

    // call Claude
    const settings: ExtractionSettings = {
        sourceLanguage:       extraction.sourceLanguage,
        sourceTopic:          extraction.sourceTopic,
        structureDescription: extraction.structureDescription,
        ignore:               extraction.ignore ?? '',
        descriptionLength:    extraction.descriptionLength,
        additionalInstructions: extraction.additionalInstructions ?? '',
    };
    const result = await callClaude(buildPrompt(text, settings));

    // save Claude result to S3
    const s3Key = `extractions/${extractionId}/batch-${batchIndex}.json`;
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: JSON.stringify(result),
        ContentType: 'application/json',
    }));

    // mark batch completed + atomically increment completedBatches
    const { Attributes: updated } = await dynamo.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: extractionId },
        UpdateExpression: `SET batches[${batchIndex}].#s = :completed, batches[${batchIndex}].s3ResultKey = :key ADD completedBatches :one`,
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':completed': 'completed', ':key': s3Key, ':one': 1 },
        ReturnValues: 'ALL_NEW',
    }));

    // if all batches done → mark extraction completed
    if (updated!.completedBatches === updated!.totalBatches) {
        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: extractionId },
            UpdateExpression: 'SET #s = :completed, completedAt = :now',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
                ':completed': 'completed',
                ':now': new Date().toISOString(),
            },
        }));
    }
}



function buildPrompt(text: string, settings: ExtractionSettings): string {
    const lines = [
        `LANGUAGE: ${settings.sourceLanguage}`,
        `TOPIC: ${settings.sourceTopic}`,
        `DESCRIPTION LENGTH: ${settings.descriptionLength}`,
        `STRUCTURE: ${settings.structureDescription}`,
        `IGNORE: ${settings.ignore}`,
    ];
    if (settings.additionalInstructions) {
        lines.push(`ADDITIONAL INSTRUCTIONS: ${settings.additionalInstructions}`);
    }
    lines.push('', 'TEXT:', text);
    return lines.join('\n');
}

async function callClaude(userPrompt: string): Promise<ClaudeResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': await getAnthropicApiKey(),
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 16000,
            system: GENERAL_INSTRUCTIONS,
            messages: [{ role: 'user', content: userPrompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as { content: { text: string }[]; stop_reason: string };
    if (data.stop_reason === 'max_tokens') {
        throw new Error('Anthropic API response was truncated (stop_reason: max_tokens) — batch may be too dense for the current max_tokens limit');
    }
    const aiText = stripCodeFence(data.content[0].text);
    return JSON.parse(aiText) as ClaudeResult;
}

function stripCodeFence(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith('```')) {
        const start = trimmed.indexOf('\n') + 1;
        const end = trimmed.lastIndexOf('```');
        return trimmed.slice(start, end).trim();
    }
    return trimmed;
}
