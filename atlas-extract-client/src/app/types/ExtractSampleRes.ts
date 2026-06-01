import { ExtractedItem } from "./ExtractedItem";

export interface ExtractSampleRes {
    summary: ExtractedItem[];
    error?: string;
    message?: string;
}