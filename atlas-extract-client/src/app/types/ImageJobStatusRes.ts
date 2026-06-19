export interface ImageJobStatusRes {
    status: 'processing' | 'completed' | 'failed';
    image1024Url?: string;
    image350Url?: string;
    errorMessage?: string;
}
