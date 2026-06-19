import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';



const secretsClient = new SecretsManagerClient({});

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
    title: string;
    description: string;
    category: string;
    tags: string[];
}

interface ImageGenRes {
    image: string; // base64 png, 1024x1024
}



// Invoked synchronously (RequestResponse) by the .NET backend — not SQS-triggered like the other workers
export async function handler(event: ImageGenReq): Promise<ImageGenRes> {
    const { title, description, category, tags } = event;
    const image = await generateImageB64(title, description, category, tags ?? []);
    return { image };
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
