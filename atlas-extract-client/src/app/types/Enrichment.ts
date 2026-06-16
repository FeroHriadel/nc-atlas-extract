export interface EnrichmentItem {
    title: string;
    status: string;
    errorMessage?: string;
    s3Folder?: string;
}

export interface Enrichment {
    extractionId: string;
    gpsEnabled: boolean;
    imagesEnabled: boolean;
    country?: string;
    totalItems: number;
    completedItems: number;
    failedItems: number;
    status: string;
    startedAt: string;
    completedAt?: string;
    items: EnrichmentItem[];
}

export interface EnrichmentStartReq {
    gpsEnabled: boolean;
    imagesEnabled: boolean;
    country?: string;
}

export interface EnrichedItemLocation {
    country?: string;
    state?: string;
    county?: string;
    coordinates?: [number, number];
}

export interface EnrichedItem {
    title: string;
    status: string;
    errorMessage?: string;
    description?: string;
    category?: string;
    tags?: string[];
    location?: EnrichedItemLocation;
    image350Url?: string;
    image1024Url?: string;
}
