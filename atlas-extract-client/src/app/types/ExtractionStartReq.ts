export interface ExtractStartReq {
    pages: {startPage: number; endPage: number}[];
    friendlyName: string;
    sourceId: string;
    sourceLanguage: string;
    sourceTopic: string;
    structureDescription: string;
    ignore?: string;
    descriptionLength: string;
    additionalInstructions?: string;
}