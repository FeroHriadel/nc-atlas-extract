export interface ExtractionBatchUrl {
    batchIndex: number;
    startPage: number;
    endPage: number;
    url: string;
}

export interface ExtractionJsonRes {
    extractionId: string;
    batches: ExtractionBatchUrl[];
}
