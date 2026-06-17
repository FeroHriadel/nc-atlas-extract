export interface DailyStats {
    date: string;
    extractedItems: number;
    imagesGenerated: number;
    failedExtractions: number;
    failedEnrichments: number;
}

export interface OverallStats {
    extractedItems: number;
    imagesGenerated: number;
    failedExtractions: number;
    failedEnrichments: number;
}

export interface StatsRes {
    thisMonth: DailyStats[];
    overall: OverallStats;
}
