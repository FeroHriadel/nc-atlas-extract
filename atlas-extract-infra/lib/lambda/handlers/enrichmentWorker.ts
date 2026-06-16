import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Jimp } from 'jimp';



const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const ENRICHMENTS_TABLE = process.env.ENRICHMENTS_TABLE_NAME!;
const BUCKET_NAME = process.env.SOURCES_BUCKET_NAME!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;



interface SqsMessageBody {
    extractionId: string;
    itemIndex: number;
    title: string;
    description: string;
    category: string;
    tags: string[];
    gpsEnabled: boolean;
    imagesEnabled: boolean;
    country?: string;
    s3BaseKey: string;
}

interface GpsResult {
    country: string;
    state: string;
    county: string;
    coordinates: [number, number];
}



export async function handler(event: SQSEvent): Promise<void> {
    const msg: SqsMessageBody = JSON.parse(event.Records[0].body);
    const { extractionId, itemIndex, title, description, category, tags, gpsEnabled, imagesEnabled, country, s3BaseKey } = msg;

    await markItemStatus(extractionId, itemIndex, 'processing');

    try {
        let location: GpsResult | undefined;
        let image1024Key: string | undefined;
        let image350Key: string | undefined;

        if (gpsEnabled && country) {
            location = await getGps(title, country);
        }

        if (imagesEnabled) {
            const b64 = await generateImageB64(title, description, category, tags);
            const originalBuffer = Buffer.from(b64, 'base64');
            const img = await Jimp.fromBuffer(originalBuffer);
            img.resize({ w: 350, h: 350 });
            const thumbnail = await img.getBuffer('image/png');

            image1024Key = `${s3BaseKey}/1024.png`;
            image350Key  = `${s3BaseKey}/350.png`;

            await Promise.all([
                s3.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: image1024Key, Body: originalBuffer, ContentType: 'image/png' })),
                s3.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: image350Key,  Body: thumbnail,       ContentType: 'image/png' })),
            ]);
        }

        const itemJson = { title, description, category, tags, location, image1024: image1024Key, image350: image350Key };
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `${s3BaseKey}/item.json`,
            Body: JSON.stringify(itemJson),
            ContentType: 'application/json',
        }));

        await markItemCompleted(extractionId, itemIndex, s3BaseKey);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Enrichment failed for item ${itemIndex} of extraction ${extractionId}:`, errorMessage);
        await markItemFailed(extractionId, itemIndex, errorMessage);
    }
}



async function getGps(title: string, country: string): Promise<GpsResult | undefined> {
    const q = encodeURIComponent(`${title} ${country}`);
    const res = await fetch(`https://photon.komoot.io/api/?q=${q}&limit=1`);
    if (!res.ok) return undefined;

    const data = await res.json() as {
        features: {
            geometry: { coordinates: [number, number] };
            properties: { country?: string; state?: string; county?: string };
        }[];
    };
    if (!data.features?.length) return undefined;

    const f = data.features[0];
    return {
        country:     f.properties.country ?? '',
        state:       f.properties.state ?? '',
        county:      f.properties.county ?? '',
        coordinates: [f.geometry.coordinates[1], f.geometry.coordinates[0]], // lat, lon
    };
}

async function generateImageB64(title: string, description: string, category: string, tags: string[]): Promise<string> {
    const prompt = `A photorealistic image of "${title}". ${description} Category: ${category}. Tags: ${tags.join(', ')}.`;

    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

async function markItemStatus(extractionId: string, itemIndex: number, status: string): Promise<void> {
    await dynamo.send(new UpdateCommand({
        TableName: ENRICHMENTS_TABLE,
        Key: { extractionId },
        UpdateExpression: `SET #items[${itemIndex}].#s = :status`,
        ExpressionAttributeNames: { '#items': 'items', '#s': 'status' },
        ExpressionAttributeValues: { ':status': status },
    }));
}

async function markItemCompleted(extractionId: string, itemIndex: number, s3Folder: string): Promise<void> {
    const { Attributes: updated } = await dynamo.send(new UpdateCommand({
        TableName: ENRICHMENTS_TABLE,
        Key: { extractionId },
        UpdateExpression: `SET #items[${itemIndex}].#s = :completed, #items[${itemIndex}].s3Folder = :folder ADD completedItems :one`,
        ExpressionAttributeNames: { '#items': 'items', '#s': 'status' },
        ExpressionAttributeValues: { ':completed': 'completed', ':folder': s3Folder, ':one': 1 },
        ReturnValues: 'ALL_NEW',
    }));

    if ((updated!.completedItems as number) + (updated!.failedItems as number) >= (updated!.totalItems as number)) {
        await finalizeEnrichment(extractionId);
    }
}

async function markItemFailed(extractionId: string, itemIndex: number, errorMessage: string): Promise<void> {
    const { Attributes: updated } = await dynamo.send(new UpdateCommand({
        TableName: ENRICHMENTS_TABLE,
        Key: { extractionId },
        UpdateExpression: `SET #items[${itemIndex}].#s = :failed, #items[${itemIndex}].errorMessage = :err ADD failedItems :one`,
        ExpressionAttributeNames: { '#items': 'items', '#s': 'status' },
        ExpressionAttributeValues: { ':failed': 'failed', ':err': errorMessage, ':one': 1 },
        ReturnValues: 'ALL_NEW',
    }));

    if ((updated!.completedItems as number) + (updated!.failedItems as number) >= (updated!.totalItems as number)) {
        await finalizeEnrichment(extractionId);
    }
}

async function finalizeEnrichment(extractionId: string): Promise<void> {
    await dynamo.send(new UpdateCommand({
        TableName: ENRICHMENTS_TABLE,
        Key: { extractionId },
        UpdateExpression: 'SET #s = :completed, completedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':completed': 'completed', ':now': new Date().toISOString() },
    }));
}
