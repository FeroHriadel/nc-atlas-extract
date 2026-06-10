import { ExtractedItem } from './ExtractedItem';

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

export interface ExtractionBatchResult {
    batchIndex: number;
    startPage: number;
    endPage: number;
    s3ResultKey: string;
    items: ExtractedItem[];
}
