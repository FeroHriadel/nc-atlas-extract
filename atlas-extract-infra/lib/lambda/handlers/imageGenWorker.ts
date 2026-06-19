import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Jimp } from 'jimp';



const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const secretsClient = new SecretsManagerClient({});

const IMAGE_JOBS_TABLE = process.env.IMAGE_JOBS_TABLE_NAME!;
const BUCKET_NAME = process.env.SOURCES_BUCKET_NAME!;

let cachedOpenAiApiKey: string | undefined;

async function getOpenAiApiKey(): Promise<string> {
    if (cachedOpenAiApiKey) return cachedOpenAiApiKey;
    if (process.env.OPENAI_API_KEY) {
        cachedOpenAiApiKey = process.env.OPENAI_API_KEY;
        return cachedOpenAiApiKey;
    }
    const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: process.env.API_KEYS_SECRET_ARN! }));
    cachedOpenAiApiKey = JSON.parse(res.SecretString!).OPENAI_API_KEY;
    return cachedOpenAiApiKey!;
}



interface ImageGenReq {
    jobId: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
}



// Invoked asynchronously (Event) by the .NET backend — the BE already wrote a "processing" job record
// before invoking this, so it returns immediately and this lambda just updates that record when done.
export async function handler(event: ImageGenReq): Promise<void> {
    const { jobId, title, description, category, tags } = event;

    try {
        const b64 = await generateImageB64(title, description, category, tags ?? []);
        const originalBuffer = Buffer.from(b64, 'base64');
        const img = await Jimp.fromBuffer(originalBuffer);
        img.resize({ w: 350, h: 350 });
        const thumbnail = await img.getBuffer('image/png');

        const image1024Key = `generated-images/${jobId}/1024.png`;
        const image350Key = `generated-images/${jobId}/350.png`;

        await Promise.all([
            s3.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: image1024Key, Body: originalBuffer, ContentType: 'image/png' })),
            s3.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: image350Key, Body: thumbnail, ContentType: 'image/png' })),
        ]);

        await markJobCompleted(jobId, image1024Key, image350Key);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Image generation failed for job ${jobId}:`, errorMessage);
        await markJobFailed(jobId, errorMessage);
    }
}



async function generateImageB64(title: string, description: string, category: string, tags: string[]): Promise<string> {
    const prompt = `A photorealistic image of "${title}". ${description} Category: ${category}. Tags: ${tags.join(', ')}.`;

    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await getOpenAiApiKey()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024' }),
        });

        if (res.status === 429) {
            const body = await res.json() as { error: { message: string } };
            const waitMs = parseRetryAfterMs(body.error.message);
            console.log(`Rate limited by OpenAI. Waiting ${waitMs}ms before retry ${attempt + 1}...`);
            await sleep(waitMs);
            continue;
        }

        if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);

        const data = await res.json() as { data: { b64_json: string }[] };
        return data.data[0].b64_json;
    }

    throw new Error('OpenAI image generation failed: rate limit retries exhausted');
}

function parseRetryAfterMs(message: string): number {
    const match = message.match(/try again in (\d+(?:\.\d+)?)s/i);
    const seconds = match ? parseFloat(match[1]) : 15;
    return Math.ceil(seconds * 1000) + 1000; // add 1s buffer
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function markJobCompleted(jobId: string, image1024Key: string, image350Key: string): Promise<void> {
    await dynamo.send(new UpdateCommand({
        TableName: IMAGE_JOBS_TABLE,
        Key: { jobId },
        UpdateExpression: 'SET #s = :completed, image1024Key = :k1024, image350Key = :k350, completedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
            ':completed': 'completed',
            ':k1024': image1024Key,
            ':k350': image350Key,
            ':now': new Date().toISOString(),
        },
    }));
}

async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await dynamo.send(new UpdateCommand({
        TableName: IMAGE_JOBS_TABLE,
        Key: { jobId },
        UpdateExpression: 'SET #s = :failed, errorMessage = :err, completedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
            ':failed': 'failed',
            ':err': errorMessage,
            ':now': new Date().toISOString(),
        },
    }));
}
